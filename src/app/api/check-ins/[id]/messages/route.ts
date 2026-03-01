import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { processCheckInReply } from "@/lib/check-in/process-reply";

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

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
  });
  if (!checkIn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (checkIn.patientId !== userId) {
    return NextResponse.json({ error: "Only the patient can reply to this check-in" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const content = (body.content as string)?.trim();

  const result = await processCheckInReply(userId, checkInId, content ?? "");
  if (!result.ok) {
    const status =
      result.error === "content required"
        ? 400
        : result.error === "Check-in not found"
          ? 404
          : result.error === "Forbidden"
            ? 403
            : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const messages = await prisma.checkInMessage.findMany({
    where: { checkInId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}
