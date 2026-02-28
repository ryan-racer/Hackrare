import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role;
  const { searchParams } = new URL(req.url);
  const patientIdParam = searchParams.get("patientId");

  if (role === "patient") {
    const checkIns = await prisma.checkIn.findMany({
      where: { patientId: userId! },
      orderBy: { scheduledAt: "desc" },
      include: {
        template: { select: { id: true, name: true } },
        response: true,
        summary: true,
      },
    });
    return NextResponse.json(checkIns);
  }

  if (role === "doctor") {
    const linked = await prisma.patientDoctor.findMany({
      where: { doctorId: userId! },
      select: { patientId: true },
    });
    const patientIds = linked.map((l) => l.patientId);
    if (patientIds.length === 0) {
      return NextResponse.json([]);
    }
    const filterPatient = patientIdParam && patientIds.includes(patientIdParam) ? patientIdParam : undefined;
    const checkIns = await prisma.checkIn.findMany({
      where: {
        patientId: filterPatient ?? { in: patientIds },
      },
      orderBy: { scheduledAt: "desc" },
      include: {
        template: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true, email: true } },
        response: true,
        summary: true,
      },
    });
    return NextResponse.json(checkIns);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role;
  let patientId: string;

  const body = await req.json().catch(() => ({}));
  const templateId = body.templateId as string | undefined;
  const forPatientId = body.patientId as string | undefined;

  if (role === "patient") {
    patientId = userId!;
    if (forPatientId && forPatientId !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "doctor") {
    if (!forPatientId) {
      return NextResponse.json({ error: "patientId required for doctor" }, { status: 400 });
    }
    const link = await prisma.patientDoctor.findUnique({
      where: {
        patientId_doctorId: { patientId: forPatientId, doctorId: userId! },
      },
    });
    if (!link) {
      return NextResponse.json({ error: "Patient not linked" }, { status: 403 });
    }
    patientId = forPatientId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  const assignment = await prisma.journalAssignment.findFirst({
    where: { patientId, templateId, active: true },
    include: { template: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Template not assigned to this patient" }, { status: 400 });
  }

  const flow = JSON.parse(assignment.template.questionFlow) as { questions: { id: string; prompt: string }[] };
  const firstQuestion = flow.questions[0];
  if (!firstQuestion) {
    return NextResponse.json({ error: "Template has no questions" }, { status: 400 });
  }

  const scheduledAt = new Date();
  const checkIn = await prisma.checkIn.create({
    data: {
      patientId,
      templateId,
      scheduledAt,
      status: "in_progress",
    },
  });

  await prisma.checkInMessage.create({
    data: {
      checkInId: checkIn.id,
      role: "assistant",
      content: firstQuestion.prompt,
    },
  });

  return NextResponse.json({
    ...checkIn,
    template: assignment.template,
  });
}
