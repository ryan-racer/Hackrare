import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id },
    include: {
      template: true,
      response: true,
      summary: true,
      patient: { select: { id: true, name: true, email: true } },
    },
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

  return NextResponse.json(checkIn);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const userId = sessionWithUser.user.id;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!checkIn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (checkIn.patientId !== userId) {
    return NextResponse.json({ error: "Only the patient can edit this check-in" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rawData = body.rawData;
  if (typeof rawData !== "object" || rawData === null) {
    return NextResponse.json({ error: "rawData object required" }, { status: 400 });
  }

  await prisma.checkInResponse.upsert({
    where: { checkInId: id },
    create: { checkInId: id, rawData: JSON.stringify(rawData) },
    update: { rawData: JSON.stringify(rawData) },
  });

  const reSummarize = body.reSummarize === true;
  if (reSummarize) {
    const { generateMedicalSummary } = await import("@/lib/llm/summarize");
    try {
      const medicalSummary = await generateMedicalSummary(
        checkIn.template.name,
        checkIn.template.condition,
        rawData as Record<string, unknown>
      );
      await prisma.checkInSummary.upsert({
        where: { checkInId: id },
        create: { checkInId: id, medicalSummary, modelUsed: "gpt-4o-mini" },
        update: { medicalSummary, modelUsed: "gpt-4o-mini" },
      });
    } catch (e) {
      console.error("Re-summarize failed:", e);
    }
  }

  const updated = await prisma.checkIn.findUnique({
    where: { id },
    include: { response: true, summary: true },
  });
  return NextResponse.json(updated);
}
