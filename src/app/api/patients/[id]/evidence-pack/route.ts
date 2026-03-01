import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { buildEvidencePack, type SymptomEntry, type PatientContext } from "@/lib/llm/evidence-pack";

// GET /api/patients/[id]/evidence-pack — fetch latest report(s)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientId } = await params;

  // Doctors can view their patients; patients can view their own
  if (session.user.role === "doctor") {
    const link = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
    });
    if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (session.user.id !== patientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.clinicianReport.findMany({
    where: { patientId },
    orderBy: { generatedAt: "desc" },
    take: 5,
  });

  return NextResponse.json(reports);
}

// POST /api/patients/[id]/evidence-pack — generate a new evidence pack
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionWithUser(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientId } = await params;

  // Only doctors (for this patient) can generate
  if (session.user.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden: doctors only" }, { status: 403 });
  }
  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId: session.user.id } },
  });
  if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const periodDays: number = Number(body?.periodDays ?? 30);

  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch patient profile
  const patient = await prisma.user.findUnique({ where: { id: patientId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Fetch check-in summaries in period
  const checkIns = await prisma.checkIn.findMany({
    where: { patientId, scheduledAt: { gte: periodStart } },
    include: { summary: true, response: true, template: true },
    orderBy: { scheduledAt: "asc" },
  });

  // Fetch general chat symptom extractions in period
  const chats = await prisma.generalChat.findMany({
    where: { patientId, NOT: { extractedData: null }, createdAt: { gte: periodStart } },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  // Build SymptomEntry array
  const symptomEntries: SymptomEntry[] = [];

  for (const ci of checkIns) {
    if (!ci.response?.rawData) continue;
    try {
      const raw = JSON.parse(ci.response.rawData) as Record<string, unknown>;
      const date = ci.scheduledAt.toISOString().split("T")[0];
      symptomEntries.push({
        date,
        source: "checkin",
        symptoms: [
          {
            name: ci.template.condition ?? ci.template.name,
            severity: typeof raw.severity === "number" ? raw.severity : undefined,
            character: ci.summary?.medicalSummary ?? undefined,
          },
        ],
      });
    } catch { /* skip malformed */ }
  }

  for (const chat of chats) {
    if (!chat.extractedData) continue;
    try {
      const data = JSON.parse(chat.extractedData) as {
        symptoms?: Array<{
          name: string; character?: string; severity?: number; duration?: string;
          location?: string; frequency?: string; triggers?: string;
          alleviating?: string; associated?: string; dailyImpact?: string;
        }>;
      };
      if (data.symptoms?.length) {
        symptomEntries.push({
          date: chat.createdAt.toISOString().split("T")[0],
          source: "chat",
          symptoms: data.symptoms.map((s) => ({
            name: s.name,
            severity: s.severity,
            character: s.character,
            duration: s.duration,
            location: s.location,
            frequency: s.frequency,
            triggers: s.triggers,
            alleviating: s.alleviating,
            associated: s.associated,
            dailyImpact: s.dailyImpact,
          })),
        });
      }
    } catch { /* skip malformed */ }
  }

  const patientContext: PatientContext = {
    name: patient.name ?? patient.email,
    dateOfBirth: patient.dateOfBirth?.toISOString().split("T")[0] ?? null,
    currentDiagnoses: patient.currentDiagnoses
      ? (JSON.parse(patient.currentDiagnoses) as string[])
      : [],
    currentMedications: patient.currentMedications
      ? (JSON.parse(patient.currentMedications) as Array<{ name: string; dose?: string; frequency?: string }>)
      : [],
    allergies: patient.allergies,
  };

  const { reportMd, hpoTerms, candidateConditions, recommendedTests } = await buildEvidencePack(
    patientContext,
    symptomEntries,
    periodDays
  );

  const report = await prisma.clinicianReport.create({
    data: {
      patientId,
      periodStart,
      periodEnd: new Date(),
      reportMd,
      hpoTerms: JSON.stringify(hpoTerms),
      candidateConditions: JSON.stringify(candidateConditions),
      checkinsUsed: checkIns.length + chats.length,
    },
  });

  return NextResponse.json({ ...report, recommendedTests }, { status: 201 });
}
