import { prisma } from "@/lib/db";
import { getNextQuestion, isFlowComplete, parseAnswer } from "@/lib/journal/flow-engine";
import type { QuestionFlowDef } from "@/types/journal";
import { generateMedicalSummary } from "@/lib/llm/summarize";

export type ProcessCheckInReplyResult =
  | { ok: true; reply: string; completed: boolean }
  | { ok: false; error: string };

/**
 * Process a patient's reply to a check-in question.
 * Used by both the web API (session-authenticated) and the WhatsApp webhook.
 */
export async function processCheckInReply(
  patientId: string,
  checkInId: string,
  content: string
): Promise<ProcessCheckInReplyResult> {
  const trimmed = content?.trim();
  if (!trimmed) return { ok: false, error: "content required" };

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { template: true },
  });
  if (!checkIn) return { ok: false, error: "Check-in not found" };
  if (checkIn.patientId !== patientId) return { ok: false, error: "Forbidden" };
  if (checkIn.status === "completed") return { ok: false, error: "Check-in already completed" };

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
  if (!currentQuestion) return { ok: false, error: "No current question" };

  const value = parseAnswer(currentQuestion, trimmed);
  if (value === null || value === undefined) {
    return {
      ok: false,
      error: "Could not parse answer; please try again.",
    };
  }
  const newAnswers = { ...answers, [currentQuestion.id]: value };

  await prisma.checkInMessage.createMany({
    data: [{ checkInId, role: "user", content: trimmed }],
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

  let completed = false;
  if (isFlowComplete(flow, newAnswers)) {
    completed = true;
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

  return { ok: true, reply: assistantContent, completed };
}
