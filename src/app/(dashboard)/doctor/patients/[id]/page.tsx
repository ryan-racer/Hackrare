import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  const session = await getServerSession(authOptions);
  const doctorId = (session?.user as { id?: string })?.id;
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
      <Link href="/doctor" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
        ← Back to patients
      </Link>
      <h1 className="text-2xl font-bold mb-2">
        {link.patient.name ?? link.patient.email}
      </h1>
      <p className="text-neutral-500 text-sm mb-8">{link.patient.email}</p>

      <TrendsCharts patientId={patientId} />

      <section className="mt-8 mb-8">
        <h2 className="font-semibold text-lg mb-2">AI trend analysis</h2>
        <AIInsightSection patientId={patientId} initialInsights={insights} />
      </section>

      {generalChats.length > 0 && (
        <section className="mt-8 mb-8">
          <h2 className="font-semibold text-lg mb-4">Symptom logs (from AI chat)</h2>
          <div className="space-y-4">
            {generalChats.map((chat: { id: string; title: string | null; createdAt: Date; extractedData: string | null }) => {
              const data = JSON.parse(chat.extractedData!) as {
                symptoms: { name: string; severity?: number; duration?: string; onset?: string; notes?: string }[];
                events: { name: string; notes?: string }[];
              };
              return (
                <div key={chat.id} className="border dark:border-neutral-700 rounded-lg p-4">
                  <p className="text-sm text-neutral-500 mb-2">
                    {chat.title ?? "Chat"} — {new Date(chat.createdAt).toLocaleString()}
                  </p>
                  {data.symptoms?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold uppercase text-neutral-400 mb-1">Symptoms</p>
                      <ul className="space-y-1">
                        {data.symptoms.map((s, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{s.name}</span>
                            {s.severity != null && <span className="text-neutral-500 ml-2">severity {s.severity}/10</span>}
                            {s.duration && <span className="text-neutral-500 ml-2">· {s.duration}</span>}
                            {s.onset && <span className="text-neutral-500 ml-2">· onset: {s.onset}</span>}
                            {s.notes && <p className="text-neutral-500 text-xs mt-0.5 ml-2">{s.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.events?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-neutral-400 mb-1">Events</p>
                      <ul className="space-y-1">
                        {data.events.map((e, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{e.name}</span>
                            {e.notes && <span className="text-neutral-500 ml-2">· {e.notes}</span>}
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
        <h2 className="font-semibold text-lg mb-4">Check-in history</h2>
        <ul className="space-y-4">
          {checkIns.map((c: { id: string; scheduledAt: Date; template: { name: string }; summary?: { medicalSummary: string } | null }) => (
            <li key={c.id} className="border dark:border-neutral-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{c.template.name}</span>
                  <span className="text-neutral-500 text-sm ml-2">
                    {new Date(c.scheduledAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {c.summary && (
                <p className="mt-2 text-neutral-700 dark:text-neutral-300">
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
