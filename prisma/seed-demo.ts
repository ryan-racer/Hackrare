/**
 * Seed artificial demo data for ariznaeem18@gmail.com
 * Run: npx tsx prisma/seed-demo.ts
 *
 * Prerequisites: Run `npm run db:seed` first so doctor@test.com and migraine-journal exist.
 */

import { PrismaClient } from "@prisma/client";
import { MIGRAINE_QUESTION_FLOW } from "../src/types/journal";

const prisma = new PrismaClient();
const DEMO_EMAIL = "ariznaeem18@gmail.com";

// Sample check-in responses (migraine flow: hadHeadache, location, intensity, quality, duration, onset, notes)
const SAMPLE_RESPONSES = [
  {
    hadHeadache: true,
    location: "unilateral left",
    intensity: 7,
    quality: "throbbing",
    duration: "about 2 hours",
    onset: "yesterday morning around 9am",
    notes: "Stress at work, took ibuprofen, helped a bit",
  },
  {
    hadHeadache: true,
    location: "bilateral",
    intensity: 4,
    quality: "pressure",
    duration: "30 minutes",
    onset: "this afternoon",
    notes: "Mild, no medication needed",
  },
  {
    hadHeadache: false,
  },
  {
    hadHeadache: true,
    location: "back of head",
    intensity: 8,
    quality: "throbbing",
    duration: "4 hours",
    onset: "last night around 11pm",
    notes: "Saw some visual aura before it started. Took sumatriptan.",
  },
  {
    hadHeadache: false,
  },
  {
    hadHeadache: true,
    location: "unilateral right",
    intensity: 5,
    quality: "pressure",
    duration: "1 hour",
    onset: "this morning",
    notes: "Possibly triggered by lack of sleep",
  },
  {
    hadHeadache: false,
  },
  {
    hadHeadache: true,
    location: "bilateral",
    intensity: 6,
    quality: "throbbing",
    duration: "3 hours",
    onset: "yesterday evening",
    notes: "Weather change, took naproxen",
  },
  {
    hadHeadache: false,
  },
  {
    hadHeadache: true,
    location: "unilateral left",
    intensity: 9,
    quality: "stabbing",
    duration: "6 hours",
    onset: "early morning",
    notes: "Severe episode. Nausea. Took prescribed medication.",
  },
];

const SAMPLE_SUMMARIES: Record<number, string> = {
  0: "Patient reported a moderate-severe (7/10) left-sided throbbing headache lasting ~2 hours, onset yesterday morning. Possible stress trigger. Ibuprofen provided partial relief.",
  1: "Mild bilateral pressure headache (~30 min) in the afternoon. No medication required.",
  2: "No headache reported since last check-in.",
  3: "Severe (8/10) occipital throbbing headache, ~4 hours duration. Patient reported visual aura preceding onset. Sumatriptan used.",
  4: "No headache reported.",
  5: "Moderate (5/10) right-sided pressure headache, ~1 hour. Patient suspects sleep deprivation as trigger.",
  6: "No headache reported.",
  7: "Moderate (6/10) bilateral throbbing headache, ~3 hours. Weather change noted. Naproxen used.",
  8: "No headache reported.",
  9: "Severe (9/10) left-sided stabbing headache, ~6 hours. Associated nausea. Prescribed medication taken.",
};

async function main() {
  // Ensure migraine template exists
  const migraineTemplate = await prisma.journalTemplate.findUnique({
    where: { id: "migraine-journal" },
  });
  if (!migraineTemplate) {
    await prisma.journalTemplate.upsert({
      where: { id: "migraine-journal" },
      update: {},
      create: {
        id: "migraine-journal",
        name: "Migraine journal",
        condition: "Migraine / headache",
        schedule: "daily",
        questionFlow: JSON.stringify(MIGRAINE_QUESTION_FLOW),
      },
    });
  }

  const templateId = "migraine-journal";

  // Get or create doctor
  let doctor = await prisma.user.findUnique({
    where: { email: "doctor@test.com" },
  });
  if (!doctor) {
    doctor = await prisma.user.create({
      data: {
        email: "doctor@test.com",
        name: "Demo Doctor",
        role: "doctor",
      },
    });
  }

  // Create or update demo patient
  let patient = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!patient) {
    patient = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Ari Znaeem",
        role: "patient",
      },
    });
    console.log("Created patient:", patient.email);
  } else {
    console.log("Found existing patient:", patient.email);
  }

  // Update with full onboarding data
  await prisma.user.update({
    where: { id: patient.id },
    data: {
      name: "Ari Znaeem",
      dateOfBirth: new Date("1990-05-15"),
      heightCm: 170,
      weightKg: 72,
      phone: "+15559990001", // Unique demo number
      pcpName: "Dr. Sarah Chen",
      pcpCity: "Phoenix",
      pcpState: "AZ",
      currentDiagnoses: JSON.stringify([
        "CADASIL (working)",
        "Chronic migraine",
        "Tension-type headache",
      ]),
      currentMedications: JSON.stringify([
        { name: "Sumatriptan", dose: "50mg", frequency: "as needed" },
        { name: "Ibuprofen", dose: "400mg", frequency: "as needed" },
      ]),
      allergies: "Penicillin",
      onboardingCompletedAt: new Date(),
    },
  });

  // Link to doctor
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

  // Assign migraine journal
  await prisma.journalAssignment.upsert({
    where: {
      patientId_templateId: { patientId: patient.id, templateId },
    },
    update: { active: true },
    create: {
      patientId: patient.id,
      templateId,
      active: true,
    },
  });

  // Create check-ins over the past 3 weeks
  const now = new Date();
  const checkInsToCreate = SAMPLE_RESPONSES.length;
  const existingCount = await prisma.checkIn.count({
    where: { patientId: patient.id },
  });

  if (existingCount >= checkInsToCreate) {
    console.log(`Patient already has ${existingCount} check-ins. Skipping check-in creation.`);
  } else {
    for (let i = 0; i < checkInsToCreate; i++) {
      const daysAgo = checkInsToCreate - 1 - i;
      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() - daysAgo);
      scheduledAt.setHours(9, 0, 0, 0);

      const rawData = SAMPLE_RESPONSES[i];
      const medicalSummary = SAMPLE_SUMMARIES[i] ?? "Check-in completed.";

      const checkIn = await prisma.checkIn.create({
        data: {
          patientId: patient.id,
          templateId,
          scheduledAt,
          status: "completed",
        },
      });

      await prisma.checkInMessage.createMany({
        data: [
          { checkInId: checkIn.id, role: "assistant", content: "Did you have a headache since we last spoke?" },
          {
            checkInId: checkIn.id,
            role: "user",
            content: rawData.hadHeadache ? "Yes" : "No",
          },
        ],
      });

      await prisma.checkInResponse.create({
        data: {
          checkInId: checkIn.id,
          rawData: JSON.stringify(rawData),
        },
      });

      await prisma.checkInSummary.create({
        data: {
          checkInId: checkIn.id,
          medicalSummary,
          modelUsed: "seed",
        },
      });
    }
    console.log(`Created ${checkInsToCreate} completed check-ins`);
  }

  // Add AI insight
  const existingInsight = await prisma.aIInsight.findFirst({
    where: { patientId: patient.id },
  });
  if (!existingInsight) {
    await prisma.aIInsight.create({
      data: {
        patientId: patient.id,
        content:
          "**Trend:** Headache frequency appears elevated over the past 2 weeks (6/10 days with headache). Most episodes are moderate (5–7/10), with 2 severe episodes. Recurrent migraine with aura is a hallmark of CADASIL. Common triggers noted: stress, sleep deprivation, weather changes. Consider discussing preventive options and CADASIL workup (NOTCH3 testing, MRI brain) with your neurologist.",
        summaryIds: null,
      },
    });
    console.log("Created AI insight");
  }

  // Add a general chat with messages
  const existingChat = await prisma.generalChat.findFirst({
    where: { patientId: patient.id },
  });
  if (!existingChat) {
    const chat = await prisma.generalChat.create({
      data: {
        patientId: patient.id,
        title: "Headache tracking discussion",
      },
    });
    await prisma.generalChatMessage.createMany({
      data: [
        {
          chatId: chat.id,
          role: "user",
          content: "I've been getting more headaches lately, especially on the left side. Usually in the morning.",
        },
        {
          chatId: chat.id,
          role: "assistant",
          content:
            "Thanks for sharing. Left-sided morning headaches can have several causes. Are you experiencing any other symptoms like nausea, sensitivity to light, or visual changes before the headache starts?",
        },
        {
          chatId: chat.id,
          role: "user",
          content: "Sometimes I see some flickering lights before it gets bad. And yes, light bothers me when I have one.",
        },
      ],
    });
    console.log("Created general chat");
  }

  // ── Rare disease: CADASIL (migraines with aura are a hallmark symptom) ────────
  const CADASIL_ORPHA = "ORPHA:136";

  // Diagnosis: CADASIL as working diagnosis
  let cadasilDiagnosis = await prisma.diagnosis.findFirst({
    where: { patientId: patient.id, diseaseId: CADASIL_ORPHA },
  });
  if (!cadasilDiagnosis) {
    cadasilDiagnosis = await prisma.diagnosis.create({
      data: {
        patientId: patient.id,
        diseaseLabel: "CADASIL",
        diseaseId: CADASIL_ORPHA,
        confirmed: false,
        working: true,
        notes:
          "Working diagnosis based on recurrent migraine with aura, family history of stroke. Awaiting NOTCH3 genetic testing.",
      },
    });
    console.log("Created CADASIL diagnosis");
  }

  // CheckinTemplate for CADASIL (disease-specific daily tracking)
  const cadasilDailyTemplate = {
    diseaseLabel: "CADASIL",
    diseaseId: CADASIL_ORPHA,
    cadence: "daily",
    estimatedSeconds: 60,
    sections: [
      {
        title: "Headache & Aura",
        fields: [
          {
            id: "headache_today",
            label: "Did you have a headache today?",
            type: "boolean",
            required: true,
          },
          {
            id: "aura_today",
            label: "Any visual aura (flashing lights, blind spots)?",
            type: "boolean",
            required: false,
          },
          {
            id: "headache_severity",
            label: "Headache severity (if yes)",
            type: "slider",
            required: false,
            min: 0,
            max: 10,
            redFlag: true,
            redFlagThreshold: 8,
          },
        ],
      },
      {
        title: "Neurological",
        fields: [
          {
            id: "cognitive_fog",
            label: "Cognitive fog or word-finding difficulty?",
            type: "boolean",
            required: false,
          },
          {
            id: "mood_change",
            label: "Mood changes or depression?",
            type: "boolean",
            required: false,
          },
        ],
      },
    ],
    redFlagScreen: [
      "Sudden weakness or numbness on one side",
      "Sudden difficulty speaking or understanding",
      "Sudden vision loss",
      "Severe headache unlike any before",
    ],
    redFlagInstructions:
      "If you experience any of the above, seek emergency care immediately. These may indicate a stroke.",
  };

  const existingCadTemplate = await prisma.checkinTemplate.findFirst({
    where: { diagnosisId: cadasilDiagnosis.id },
  });
  if (!existingCadTemplate) {
    await prisma.checkinTemplate.create({
      data: {
        diagnosisId: cadasilDiagnosis.id,
        templateJson: JSON.stringify(cadasilDailyTemplate),
        cadence: "daily",
      },
    });
    console.log("Created CADASIL check-in template");
  }

  // ClinicianReport: pre-generated evidence pack
  const existingReport = await prisma.clinicianReport.findFirst({
    where: { patientId: patient.id },
  });
  if (!existingReport) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 21);

    const hpoTerms = [
      { label: "Migraine with aura", hpoId: "HP:0002077", verified: true },
      { label: "Recurrent headache", hpoId: "HP:0012650", verified: true },
      { label: "Photophobia", hpoId: "HP:0000613", verified: true },
      { label: "Nausea", hpoId: "HP:0002018", verified: true },
      { label: "Cognitive impairment", hpoId: "HP:0100543", verified: false },
    ];

    const candidateConditions = [
      {
        name: "CADASIL",
        orphaCode: "ORPHA:136",
        matchedTerms: ["Migraine with aura", "Recurrent headache", "Photophobia"],
        discriminators: {
          strengthen: [
            "Family history of stroke or migraine",
            "MRI showing white matter lesions",
            "NOTCH3 mutation on genetic testing",
          ],
          weaken: [
            "No migraine with aura",
            "Normal brain MRI",
            "Negative NOTCH3 testing",
          ],
        },
        references: [
          { label: "Orphanet: CADASIL", url: null, pmid: null, verified: true },
          { label: "Chabriat et al. Lancet Neurol 2009", url: null, pmid: "19282247", verified: true },
        ],
      },
      {
        name: "Familial hemiplegic migraine",
        orphaCode: "ORPHA:342",
        matchedTerms: ["Migraine with aura", "Recurrent headache"],
        discriminators: {
          strengthen: ["Motor weakness during aura", "Family history of similar migraines"],
          weaken: ["No hemiplegia during aura", "Late onset"],
        },
        references: [{ label: "Orphanet: Familial hemiplegic migraine", url: null, pmid: null, verified: true }],
      },
    ];

    const reportMd = `# SignalBridge Evidence Pack
**Patient:** Ari Znaeem | **Generated:** ${periodEnd.toISOString().split("T")[0]} | **Period:** last 21 days | **Entries:** 10

> ⚠️ This is NOT a diagnosis. These are conditions to consider and discuss with the patient's care team.

---

## Patient Summary
34-year-old patient with recurrent migraine with aura, photophobia, and nausea. Headache frequency elevated over past 2 weeks (6/10 days). Episodes often left-sided, throbbing, with visual aura preceding onset. Triggers include stress, sleep deprivation, weather changes. Working diagnosis of CADASIL under consideration; NOTCH3 genetic testing pending.

---

## Standardized Phenotypes (HPO)
- **Migraine with aura** (HP:0002077)
- **Recurrent headache** (HP:0012650)
- **Photophobia** (HP:0000613)
- **Nausea** (HP:0002018)
- **Cognitive impairment** (HP:0100543 — needs verification)

---

## Candidate Conditions to Consider
> For clinician discussion only. Not diagnostic.

### CADASIL (ORPHA:136)
**Matched phenotypes:** Migraine with aura, Recurrent headache, Photophobia

**What would strengthen this hypothesis:**
- Family history of stroke or migraine
- MRI showing white matter lesions
- NOTCH3 mutation on genetic testing

**What would argue against:**
- No migraine with aura
- Normal brain MRI
- Negative NOTCH3 testing

**References:**
  - Orphanet: CADASIL
  - Chabriat et al. Lancet Neurol 2009 (PMID: 19282247)

---

### Familial hemiplegic migraine (ORPHA:342)
**Matched phenotypes:** Migraine with aura, Recurrent headache

**What would strengthen this hypothesis:**
- Motor weakness during aura
- Family history of similar migraines

**What would argue against:**
- No hemiplegia during aura
- Late onset

**References:**
  - Orphanet: Familial hemiplegic migraine

---

## Questions for Clinician Visit
- Consider NOTCH3 genetic testing if CADASIL remains on differential
- MRI brain with FLAIR to evaluate for characteristic white matter changes
- Review family history for stroke, migraine, or early cognitive decline

---

## Tests / Topics to Discuss
- 🧬 **NOTCH3 genetic testing** — Rule in/out CADASIL in patient with migraine with aura
- 🖼️ **MRI brain with FLAIR** — Evaluate for CADASIL-typical leukoencephalopathy
- 👨‍⚕️ **Neurology referral** — For rare headache disorder workup

---
_Generated by SignalBridge · Demo seed data_`;

    await prisma.clinicianReport.create({
      data: {
        patientId: patient.id,
        periodStart,
        periodEnd,
        reportMd,
        hpoTerms: JSON.stringify(hpoTerms),
        candidateConditions: JSON.stringify(candidateConditions),
        checkinsUsed: 10,
      },
    });
    console.log("Created ClinicianReport (evidence pack)");
  }

  // Alerts
  const existingAlerts = await prisma.alert.count({
    where: { patientId: patient.id },
  });
  if (existingAlerts === 0) {
    await prisma.alert.createMany({
      data: [
        {
          patientId: patient.id,
          severity: "watch",
          title: "Migraine frequency elevated",
          message:
            "6 of the last 10 days included headache. Consider discussing preventive options and CADASIL workup with your neurologist.",
          resolved: false,
        },
        {
          patientId: patient.id,
          severity: "info",
          title: "Migraine with aura documented",
          message:
            "Visual aura noted in recent check-ins. This supports the working CADASIL differential. NOTCH3 testing recommended.",
          resolved: false,
        },
      ],
    });
    console.log("Created 2 alerts");
  }

  console.log("\nDemo seed complete for", DEMO_EMAIL);
  console.log("Log in with Auth0 as ariznaeem18@gmail.com to see the data.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
