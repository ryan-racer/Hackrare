import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  diseaseLabel: z.string().min(1),
  diseaseId: z.string().optional().nullable(),
  confirmed: z.boolean().optional().default(false),
  working: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
});

// GET /api/patients/[id]/diagnoses
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

  const diagnoses = await prisma.diagnosis.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: { checkinTemplates: true },
  });

  return NextResponse.json(diagnoses);
}

// POST /api/patients/[id]/diagnoses — doctor adds a diagnosis
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden: doctors only" }, { status: 403 });
  }

  const { id: patientId } = await params;
  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const diagnosis = await prisma.diagnosis.create({
    data: {
      patientId,
      diseaseLabel: parsed.data.diseaseLabel,
      diseaseId: parsed.data.diseaseId ?? null,
      confirmed: parsed.data.confirmed,
      working: parsed.data.working,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json(diagnosis, { status: 201 });
}
