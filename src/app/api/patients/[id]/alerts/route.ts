import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

// GET /api/patients/[id]/alerts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientId } = await params;

  if (session.user.role === "doctor") {
    const link = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
    });
    if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const resolved = url.searchParams.get("resolved");

  const alerts = await prisma.alert.findMany({
    where: {
      patientId,
      ...(resolved === null ? { resolved: false } : {}),
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(alerts);
}

// PATCH /api/patients/[id]/alerts — resolve alert(s)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientId } = await params;

  if (session.user.role === "doctor") {
    const link = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
    });
    if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const alertId: string | undefined = body?.alertId;
  const resolveAll: boolean = body?.resolveAll === true;

  if (resolveAll) {
    await prisma.alert.updateMany({ where: { patientId }, data: { resolved: true } });
    return NextResponse.json({ ok: true });
  }

  if (!alertId) return NextResponse.json({ error: "alertId required" }, { status: 400 });

  const alert = await prisma.alert.findFirst({ where: { id: alertId, patientId } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.alert.update({ where: { id: alertId }, data: { resolved: true } });
  return NextResponse.json(updated);
}
