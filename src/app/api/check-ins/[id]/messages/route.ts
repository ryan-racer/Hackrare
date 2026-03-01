import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { getNextQuestion, isFlowComplete, parseAnswer } from "@/lib/journal/flow-engine";
import type { QuestionFlowDef } from "@/types/journal";
import { generateMedicalSummary } from "@/lib/llm/summarize";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: checkInId } = await params;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { template: true },
  });
  if (!checkIn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = sessionWithUser.user.id;
  const role = sessionWithUser.user.role;
  if (checkIn.patientId !== userId && role !== "doctor") {
    const link = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId: checkIn.patientId, doctorId: userId } },
    });
    if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.checkInMessage.findMany({
    where: { checkInId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: checkInId } = await params;
  const userId = sessionWithUser.user.id;
  const role = sessionWithUser.user.role;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { template: true },
  });
  if (!checkIn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (checkIn.patientId !== userId) {
    return NextResponse.json({ error: "Only the patient can reply to this check-in" }, { status: 403 });
  }
  if (checkIn.status === "completed") {
    return NextResponse.json({ error: "Check-in already completed" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const content = (body.content as string)?.trim();
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const flow = JSON.parse(checkIn.template.questionFlow) as QuestionFlowDef;
  const existingMessages = await prisma.checkInMessage.findMany({
    where: { checkInId },
    orderBy: { createdAt: "asc" },
  });
  const userMessages = existingMessages.filter((m) => m.role === "user");
  const answers: Record<string, unknown> = {};
  for (const msg of userMessages) {
    const q = getNextQuestion(flow, answers);
    if (!q) break;
    answers[q.id] = parseAnswer(q, msg.content);
  }

  const currentQuestion = getNextQuestion(flow, answers);
  if (!currentQuestion) {
    return NextResponse.json({ error: "No current question" }, { status: 400 });
  }

  const value = parseAnswer(currentQuestion, content);
  if (value === null || value === undefined) {
    return NextResponse.json({ error: "Could not parse answer; please try again." }, { status: 400 });
  }
  const newAnswers = { ...answers, [currentQuestion.id]: value };

  await prisma.checkInMessage.createMany({
    data: [
      { checkInId, role: "user", content },
    ],
  });

  const nextQuestion = getNextQuestion(flow, newAnswers);
  let assistantContent: string;
  if (nextQuestion) {
    assistantContent = nextQuestion.prompt;
  } else {
    assistantContent = "Thanks, I've recorded that. Your doctor will see a summary of this check-in.";
  }

  await prisma.checkInMessage.create({
    data: { checkInId, role: "assistant", content: assistantContent },
  });

  if (isFlowComplete(flow, newAnswers)) {
    await prisma.checkInResponse.upsert({
      where: { checkInId },
      create: { checkInId, rawData: JSON.stringify(newAnswers) },
      update: { rawData: JSON.stringify(newAnswers) },
    });
    await prisma.checkIn.update({
      where: { id: checkInId },
      data: { status: "completed" },
    });
    try {
      const medicalSummary = await generateMedicalSummary(
        checkIn.template.name,
        checkIn.template.condition,
        newAnswers
      );
      await prisma.checkInSummary.upsert({
        where: { checkInId },
        create: {
          checkInId,
          medicalSummary,
          modelUsed: "gpt-4o-mini",
        },
        update: {
          medicalSummary,
          modelUsed: "gpt-4o-mini",
        },
      });
    } catch (e) {
      console.error("Summary generation failed:", e);
    }
  }

  const messages = await prisma.checkInMessage.findMany({
    where: { checkInId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}
