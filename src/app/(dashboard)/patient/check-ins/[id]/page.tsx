import { getSessionWithUser } from "@/lib/auth0";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RawDataEditor } from "@/components/RawDataEditor";

export default async function PatientCheckInDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionWithUser = await getSessionWithUser();
  const userId = sessionWithUser?.user.id;
  if (!userId) return null;

  const { id } = await params;
  const checkIn = await prisma.checkIn.findUnique({
    where: { id, patientId: userId },
    include: { template: true, response: true, summary: true },
  });
  if (!checkIn) notFound();

  const rawData = checkIn.response
    ? (JSON.parse(checkIn.response.rawData) as Record<string, unknown>)
    : null;

  return (
    <div>
      <Link href="/patient" className="text-sm text-stone-700 hover:text-stone-900 transition-colors mb-4 inline-block">
        ← Back to check-ins
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-2">{checkIn.template.name}</h1>
      <p className="text-stone-500 text-sm mb-6">
        {new Date(checkIn.scheduledAt).toLocaleString()} — {checkIn.status}
      </p>

      <section className="mb-8">
        <h2 className="font-semibold text-stone-900 mb-2">Raw data (you can edit)</h2>
        <RawDataEditor
          checkInId={checkIn.id}
          initialRawData={rawData}
          templateName={checkIn.template.name}
        />
      </section>

      {checkIn.summary && (
        <section>
          <h2 className="font-semibold text-stone-900 mb-2">Summary for your doctor</h2>
          <p className="text-stone-700 rounded-lg bg-stone-100 p-4 leading-relaxed">
            {checkIn.summary.medicalSummary}
          </p>
        </section>
      )}
    </div>
  );
}
