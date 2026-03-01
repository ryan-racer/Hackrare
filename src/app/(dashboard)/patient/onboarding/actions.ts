"use server";

import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { sendSmsMessage } from "@/lib/sms/send";
import { z } from "zod";

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const bodySchema = z.object({
  name: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  heightCm: z.number().int().positive().optional().nullable(),
  weightKg: z.number().positive(),
  phone: z
    .string()
    .min(1, "Phone is required for SMS check-ins.")
    .refine((v) => E164_REGEX.test(v.trim()), "Phone must be E.164 format (e.g. +15551234567)"),
  pcpName: z.string().optional().nullable(),
  pcpCity: z.string().optional().nullable(),
  pcpState: z.string().max(2).optional().nullable(),
  currentDiagnoses: z.array(z.string()).optional().default([]),
  currentMedications: z
    .array(
      z.object({
        name: z.string(),
        dose: z.string().optional(),
        frequency: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  allergies: z.string().optional().nullable(),
});

export type SubmitOnboardingResult = { ok: true } | { ok: false; error: string };

export async function submitOnboarding(
  raw: unknown
): Promise<SubmitOnboardingResult> {
  const sessionWithUser = await getSessionWithUser();
  if (!sessionWithUser) {
    return { ok: false, error: "Unauthorized" };
  }
  if (sessionWithUser.user.role !== "patient") {
    return { ok: false, error: "Forbidden" };
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(raw);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof z.ZodError ? e.message : "Invalid data",
    };
  }

  if (body.dateOfBirth) {
    const birth = new Date(body.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) {
      return {
        ok: false,
        error: "You must be 18 or older to use this service.",
      };
    }
  }

  const userId = sessionWithUser.user.id;
  const normalizedPhone = body.phone.trim();

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.dateOfBirth != null &&
        body.dateOfBirth !== "" && {
          dateOfBirth: new Date(body.dateOfBirth),
        }),
      ...(body.heightCm != null && { heightCm: body.heightCm }),
      ...(body.weightKg != null && { weightKg: body.weightKg }),
      phone: normalizedPhone,
      ...(body.pcpName != null && { pcpName: body.pcpName }),
      ...(body.pcpCity != null && { pcpCity: body.pcpCity || null }),
      ...(body.pcpState != null && { pcpState: body.pcpState || null }),
      ...(body.currentDiagnoses != null && {
        currentDiagnoses: JSON.stringify(body.currentDiagnoses),
      }),
      ...(body.currentMedications != null && {
        currentMedications: JSON.stringify(body.currentMedications),
      }),
      ...(body.allergies != null && { allergies: body.allergies || null }),
      onboardingCompletedAt: new Date(),
    },
  });

  try {
    await sendSmsMessage(
      normalizedPhone,
      "Hi! You're signed up for symptom tracking. We'll check in with you about your symptoms. Reply anytime to log how you're feeling."
    );
  } catch (e) {
    console.error("SMS welcome message failed:", e);
  }

  return { ok: true };
}
