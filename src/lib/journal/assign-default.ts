import { prisma } from "@/lib/db";

const DEFAULT_TEMPLATE_ID = "migraine-journal";

/**
 * Assign the default journal template to a new patient so they receive scheduled check-ins.
 * Idempotent: does nothing if the patient already has this assignment.
 */
export async function assignDefaultJournalToPatient(patientId: string): Promise<void> {
  const template = await prisma.journalTemplate.findUnique({
    where: { id: DEFAULT_TEMPLATE_ID },
  });
  if (!template) {
    console.warn("Default journal template not found; run db:seed to create it.");
    return;
  }

  await prisma.journalAssignment.upsert({
    where: {
      patientId_templateId: { patientId, templateId: template.id },
    },
    create: {
      patientId,
      templateId: template.id,
      active: true,
    },
    update: {},
  });
}
