import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { generateTrendAnalysis } from "@/lib/llm/trend-analysis";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doctorId = sessionWithUser.user.id;
  const { id: patientId } = await params;

  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const insights = await prisma.aIInsight.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json(insights);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doctorId = sessionWithUser.user.id;
  const { id: patientId } = await params;

  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const summaries = await prisma.checkInSummary.findMany({
    where: { checkIn: { patientId } },
    include: { checkIn: { select: { scheduledAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (summaries.length === 0) {
    return NextResponse.json({ error: "No check-in summaries yet" }, { status: 400 });
  }

  const content = await generateTrendAnalysis(
    summaries.map((s) => ({
      date: s.checkIn.scheduledAt.toISOString(),
      summary: s.medicalSummary,
    }))
  );

  const insight = await prisma.aIInsight.create({
    data: {
      patientId,
      content,
      summaryIds: JSON.stringify(summaries.map((s) => s.id)),
    },
  });
  return NextResponse.json(insight);
}
