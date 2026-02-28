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

  return (
    <div>
      <Link href="/dashboard/doctor" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
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

      <section>
        <h2 className="font-semibold text-lg mb-4">Check-in history</h2>
        <ul className="space-y-4">
          {checkIns.map((c) => (
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
