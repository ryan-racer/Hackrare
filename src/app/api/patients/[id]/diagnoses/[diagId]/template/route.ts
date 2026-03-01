import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { generateDiseaseTemplate } from "@/lib/llm/disease-template";

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

  // Store all three cadence templates
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

  return NextResponse.json(
    {
      templates,
      alertRules: result.alertRules,
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
