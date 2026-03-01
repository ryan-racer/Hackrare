import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

/**
 * Cron endpoint: create check-ins for patients with active journal assignments.
 * Call with header: Authorization: Bearer <CRON_SECRET> (set CRON_SECRET in env).
 * For "daily" schedule, creates one check-in per patient per template per day if not already created.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await prisma.journalAssignment.findMany({
    where: { active: true },
    include: { template: true, patient: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let created = 0;
  for (const a of assignments) {
    const schedule = a.template.schedule ?? "daily";
    if (schedule !== "daily") continue; // extend later for cron expressions

    const existing = await prisma.checkIn.findFirst({
      where: {
        patientId: a.patientId,
        templateId: a.templateId,
        scheduledAt: { gte: today, lt: tomorrow },
      },
    });
    if (existing) continue;

    const flow = JSON.parse(a.template.questionFlow) as { questions: { id: string; prompt: string }[] };
    const firstQuestion = flow.questions?.[0];
    if (!firstQuestion) continue;

    const checkIn = await prisma.checkIn.create({
      data: {
        patientId: a.patientId,
        templateId: a.templateId,
        scheduledAt: new Date(),
        status: "in_progress",
      },
    });
    await prisma.checkInMessage.create({
      data: {
        checkInId: checkIn.id,
        role: "assistant",
        content: firstQuestion.prompt,
      },
    });

    if (a.patient.phone) {
      try {
        await sendWhatsAppMessage(a.patient.phone, firstQuestion.prompt);
      } catch (e) {
        console.error("WhatsApp send failed for check-in:", checkIn.id, e);
      }
    }

    created += 1;
  }

  return NextResponse.json({ ok: true, created });
}
