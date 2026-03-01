import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { assignDefaultJournalToPatient } from "@/lib/journal/assign-default";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export async function POST(req: Request) {
  const sessionWithUser = await getSessionWithUser(req);
  const doctorId = sessionWithUser?.user.id;
  const role = sessionWithUser?.user.role;

  if (!doctorId || role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // If patient already exists, just link them if not already linked
    if (existing.role !== "patient") {
      return NextResponse.json({ error: "That email belongs to a non-patient account" }, { status: 400 });
    }
    const existingLink = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId: existing.id, doctorId } },
    });
    if (existingLink) {
      return NextResponse.json({ error: "Patient already linked to you" }, { status: 400 });
    }
    await prisma.patientDoctor.create({
      data: { patientId: existing.id, doctorId },
    });
    return NextResponse.json({ id: existing.id, email: existing.email, name: existing.name, linked: true });
  }

  // Create patient; they will sign in via Auth0 (no local password)
  const patient = await prisma.user.create({
    data: { email, name, role: "patient" },
  });

  await prisma.patientDoctor.create({
    data: { patientId: patient.id, doctorId },
  });

  try {
    await assignDefaultJournalToPatient(patient.id);
  } catch (e) {
    console.error("Failed to assign default journal to new patient:", e);
  }

  return NextResponse.json({
    id: patient.id,
    email: patient.email,
    name: patient.name,
  });
}
