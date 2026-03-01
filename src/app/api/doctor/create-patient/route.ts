import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hashPasswordForRegister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// Generates a readable temporary password
function generateTempPassword(): string {
  const words = ["Sun", "Oak", "Bay", "Elm", "Fox", "Ivy"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}${num}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const doctorId = (session?.user as { id?: string })?.id;
  const role = (session?.user as { role?: string })?.role;

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

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPasswordForRegister(tempPassword);

  const patient = await prisma.user.create({
    data: { email, name, passwordHash, role: "patient" },
  });

  await prisma.patientDoctor.create({
    data: { patientId: patient.id, doctorId },
  });

  return NextResponse.json({
    id: patient.id,
    email: patient.email,
    name: patient.name,
    tempPassword,
  });
}
