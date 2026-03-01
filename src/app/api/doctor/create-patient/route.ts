import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { assignDefaultJournalToPatient } from "@/lib/journal/assign-default";
import {
  createAuth0User,
  sendPasswordSetupEmail,
  managementApiConfigured,
} from "@/lib/auth0-management";
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

  // Create Auth0 user + send password-setup email if Management API is configured
  let inviteUrl: string | null = null;
  let emailSent = false;
  if (managementApiConfigured()) {
    try {
      const auth0UserId = await createAuth0User(email, name);
      inviteUrl = await sendPasswordSetupEmail(auth0UserId);
      emailSent = true;
    } catch (e) {
      console.error("Auth0 invite error (non-fatal):", e);
      // Fall through — return the fallback login URL instead
      inviteUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/auth/login`;
    }
  } else {
    // No M2M creds — give doctor the login link to share manually
    inviteUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/auth/login`;
  }

  return NextResponse.json({
    id: patient.id,
    email: patient.email,
    name: patient.name,
    inviteUrl,
    emailSent,
  });
}
