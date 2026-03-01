import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  heightCm: z.number().int().positive().optional().nullable(),
  weightKg: z.number().positive(),
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

export async function PATCH(request: Request) {
  const sessionWithUser = await getSessionWithUser(request);
  if (!sessionWithUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionWithUser.user.role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof z.ZodError ? e.message : "Invalid body" },
      { status: 400 }
    );
  }

  const userId = sessionWithUser.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.dateOfBirth != null && body.dateOfBirth !== "" && {
        dateOfBirth: new Date(body.dateOfBirth),
      }),
      ...(body.heightCm != null && { heightCm: body.heightCm }),
      ...(body.weightKg != null && { weightKg: body.weightKg }),
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

  return NextResponse.json({ ok: true });
}
