import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { generateDiseaseTemplate } from "@/lib/llm/disease-template";
import type { CheckinTemplateJson } from "@/lib/llm/disease-template";

/** Convert Agent-4 CheckinTemplateJson (sections/fields) → JournalTemplate questionFlow format */
function toQuestionFlow(template: CheckinTemplateJson): string {
  type Question = {
    id: string;
    type: string;
    prompt: string;
    options?: string[];
    min?: number;
    max?: number;
    hint?: string;
  };

  const questions: Question[] = [];

  for (const section of template.sections ?? []) {
    for (const field of section.fields ?? []) {
      const q: Question = {
        id: field.id,
        type:
          field.type === "slider"
            ? "scale"
            : field.type === "select" || field.type === "checklist"
            ? "choice"
            : field.type === "boolean"
            ? "boolean"
            : "text",
        prompt: field.label + (field.hint ? ` (${field.hint})` : ""),
      };
      if (q.type === "scale") {
        q.min = field.min ?? 0;
        q.max = field.max ?? 10;
      }
      if (q.type === "choice" && field.options?.length) {
        q.options = field.options;
      }
      questions.push(q);
    }
  }

  return JSON.stringify({ questions });
}

// POST /api/patients/[id]/diagnoses/[diagId]/template — Agent 4: generate check-in templates
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; diagId: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "doctor") return NextResponse.json({ error: "Forbidden: doctors only" }, { status: 403 });

  const { id: patientId, diagId } = await params;
  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const diagnosis = await prisma.diagnosis.findFirst({ where: { id: diagId, patientId } });
  if (!diagnosis) return NextResponse.json({ error: "Diagnosis not found" }, { status: 404 });

  const result = await generateDiseaseTemplate(diagnosis.diseaseLabel, diagnosis.diseaseId);

  // Store all three cadence CheckinTemplate records
  const templates = await Promise.all([
    prisma.checkinTemplate.create({
      data: {
        diagnosisId: diagId,
        cadence: "daily",
        templateJson: JSON.stringify(result.dailyTemplate),
      },
    }),
    prisma.checkinTemplate.create({
      data: {
        diagnosisId: diagId,
        cadence: "flare",
        templateJson: JSON.stringify(result.flareTemplate),
      },
    }),
    prisma.checkinTemplate.create({
      data: {
        diagnosisId: diagId,
        cadence: "weekly",
        templateJson: JSON.stringify(result.weeklyTemplate),
      },
    }),
  ]);

  // --- Wire into the existing check-in flow ---
  // Convert daily template to JournalTemplate questionFlow and assign to patient

  const questionFlowJson = toQuestionFlow(result.dailyTemplate);

  // Create a new JournalTemplate for this disease
  const journalTemplate = await prisma.journalTemplate.create({
    data: {
      name: `${diagnosis.diseaseLabel} Daily Check-In`,
      condition: diagnosis.diseaseLabel,
      schedule: "daily",
      questionFlow: questionFlowJson,
    },
  });

  // Deactivate any existing active assignments for this patient
  await prisma.journalAssignment.updateMany({
    where: { patientId, active: true },
    data: { active: false },
  });

  // Create new assignment for the disease-specific template
  await prisma.journalAssignment.create({
    data: {
      patientId,
      templateId: journalTemplate.id,
      active: true,
    },
  });

  return NextResponse.json(
    {
      templates,
      alertRules: result.alertRules,
      journalTemplateId: journalTemplate.id,
    },
    { status: 201 }
  );
}

// GET /api/patients/[id]/diagnoses/[diagId]/template — fetch existing templates
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; diagId: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientId, diagId } = await params;

  if (session.user.role === "doctor") {
    const link = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
    });
    if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.checkinTemplate.findMany({
    where: { diagnosisId: diagId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}
