import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { MIGRAINE_QUESTION_FLOW } from "../src/lib/journal-types";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("password123", 12);

  const patient = await prisma.user.upsert({
    where: { email: "patient@test.com" },
    update: {},
    create: {
      email: "patient@test.com",
      name: "Test Patient",
      passwordHash,
      role: "patient",
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@test.com" },
    update: {},
    create: {
      email: "doctor@test.com",
      name: "Test Doctor",
      passwordHash,
      role: "doctor",
    },
  });

  await prisma.patientDoctor.upsert({
    where: {
      patientId_doctorId: { patientId: patient.id, doctorId: doctor.id },
    },
    update: {},
    create: {
      patientId: patient.id,
      doctorId: doctor.id,
    },
  });

  const migraineTemplate = await prisma.journalTemplate.upsert({
    where: { id: "migraine-journal" },
    update: { questionFlow: JSON.stringify(MIGRAINE_QUESTION_FLOW) },
    create: {
      id: "migraine-journal",
      name: "Migraine journal",
      condition: "Migraine / headache",
      schedule: "daily",
      questionFlow: JSON.stringify(MIGRAINE_QUESTION_FLOW),
    },
  });

  await prisma.journalAssignment.upsert({
    where: {
      patientId_templateId: { patientId: patient.id, templateId: migraineTemplate.id },
    },
    update: {},
    create: {
      patientId: patient.id,
      templateId: migraineTemplate.id,
      active: true,
    },
  });

  console.log("Seed done. Patient:", patient.email, "Doctor:", doctor.email, "Template: Migraine journal");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
