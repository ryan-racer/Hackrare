import { getSessionWithUser } from "@/lib/auth0";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { TrendsCharts } from "@/components/TrendsCharts";
import { AIInsightSection } from "@/components/AIInsightSection";

export default async function DoctorPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionWithUser = await getSessionWithUser();
  const doctorId = sessionWithUser?.user.id;
  if (!doctorId) return null;

  const { id: patientId } = await params;
  const link = await prisma.patientDoctor.findUnique({
    where: { patientId_doctorId: { patientId, doctorId } },
    include: { patient: true },
  });
  if (!link) notFound();

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId },
    orderBy: { scheduledAt: "desc" },
    include: { template: true, summary: true, response: true },
  });

  const insights = await prisma.aIInsight.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const generalChats = await prisma.generalChat.findMany({
    where: { patientId, NOT: { extractedData: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, extractedData: true },
  });

  return (
    <div>
      <Link href="/doctor" className="text-sm text-stone-700 hover:text-stone-900 transition-colors mb-4 inline-block">
        ← Back to patients
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-2">
        {link.patient.name ?? link.patient.email}
      </h1>
      <p className="text-stone-500 text-sm mb-8">{link.patient.email}</p>

      <TrendsCharts patientId={patientId} />

      <section className="mt-8 mb-8">
        <h2 className="font-semibold text-lg text-stone-900 mb-2">AI trend analysis</h2>
        <AIInsightSection patientId={patientId} initialInsights={insights} />
      </section>

      {generalChats.length > 0 && (
        <section className="mt-8 mb-8">
          <h2 className="font-semibold text-lg text-stone-900 mb-4">Symptom logs (from AI chat)</h2>
          <div className="space-y-4">
            {generalChats.map((chat: { id: string; title: string | null; createdAt: Date; extractedData: string | null }) => {
              const data = JSON.parse(chat.extractedData!) as {
                symptoms: {
                  name: string; character?: string; severity?: number; duration?: string;
                  onset?: string; location?: string; radiation?: string; frequency?: string;
                  triggers?: string; alleviating?: string; associated?: string;
                  dailyImpact?: string; medications?: string; notes?: string;
                }[];
                events: { name: string; notes?: string }[];
              };
              return (
                <div key={chat.id} className="border border-stone-200 rounded-lg p-4 bg-white">
                  <p className="text-sm text-stone-500 mb-2">
                    {chat.title ?? "Chat"} — {new Date(chat.createdAt).toLocaleString()}
                  </p>
                  {data.symptoms?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold uppercase text-stone-500 mb-2">Symptoms</p>
                      <ul className="space-y-3">
                        {data.symptoms.map((s, i) => {
                          const fields = [
                            s.character    ? { label: "Character",    value: s.character }    : null,
                            s.severity != null ? { label: "Severity", value: `${s.severity}/10` } : null,
                            s.duration     ? { label: "Duration",     value: s.duration }     : null,
                            s.onset        ? { label: "Onset",        value: s.onset }        : null,
                            s.location     ? { label: "Location",     value: s.location }     : null,
                            s.radiation    ? { label: "Radiates to",  value: s.radiation }    : null,
                            s.frequency    ? { label: "Frequency",    value: s.frequency }    : null,
                            s.triggers     ? { label: "Triggers",     value: s.triggers }     : null,
                            s.alleviating  ? { label: "Relieved by",  value: s.alleviating }  : null,
                            s.associated   ? { label: "Associated",   value: s.associated }   : null,
                            s.dailyImpact  ? { label: "Daily impact", value: s.dailyImpact }  : null,
                            s.medications  ? { label: "Medications",  value: s.medications }  : null,
                            s.notes        ? { label: "Notes",        value: s.notes }        : null,
                          ].filter(Boolean) as { label: string; value: string }[];
                          return (
                            <li key={i} className="text-sm">
                              <span className="font-medium">{s.name}</span>
                              {fields.length > 0 && (
                                <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5">
                                  {fields.map(({ label, value }) => (
                                    <div key={label} className="flex gap-1.5 text-xs">
                                      <span className="text-stone-400 shrink-0">{label}:</span>
                                      <span className="text-stone-700">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {data.events?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-stone-500 mb-1">Events</p>
                      <ul className="space-y-1">
                        {data.events.map((e, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium text-stone-900">{e.name}</span>
                            {e.notes && <span className="text-stone-500 ml-2">· {e.notes}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-lg text-stone-900 mb-4">Check-in history</h2>
        <ul className="space-y-4">
          {checkIns.map((c: { id: string; scheduledAt: Date; template: { name: string }; summary?: { medicalSummary: string } | null }) => (
            <li key={c.id} className="border border-stone-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-stone-900">{c.template.name}</span>
                  <span className="text-stone-500 text-sm ml-2">
                    {new Date(c.scheduledAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {c.summary && (
                <p className="mt-2 text-stone-700 leading-relaxed">
                  {c.summary.medicalSummary}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
