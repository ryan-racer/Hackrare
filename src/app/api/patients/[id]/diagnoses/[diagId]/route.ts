import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  confirmed: z.boolean().optional(),
  working: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

// PATCH /api/patients/[id]/diagnoses/[diagId] — confirm / update working status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; diagId: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: patientId, diagId } = await params;
  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const diagnosis = await prisma.diagnosis.findFirst({ where: { id: diagId, patientId } });
  if (!diagnosis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.diagnosis.update({
    where: { id: diagId },
    data: {
      confirmed: parsed.data.confirmed ?? diagnosis.confirmed,
      working: parsed.data.working ?? diagnosis.working,
      notes: parsed.data.notes !== undefined ? (parsed.data.notes ?? null) : diagnosis.notes,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/patients/[id]/diagnoses/[diagId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; diagId: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: patientId, diagId } = await params;
  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const diagnosis = await prisma.diagnosis.findFirst({ where: { id: diagId, patientId } });
  if (!diagnosis) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.diagnosis.delete({ where: { id: diagId } });
  return NextResponse.json({ ok: true });
}
