import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DoctorDashboardPage() {
  const session = await getServerSession(authOptions);
  const doctorId = (session?.user as { id?: string })?.id;
  if (!doctorId) return null;

  const links = await prisma.patientDoctor.findMany({
    where: { doctorId },
    include: {
      patient: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const patientIds = links.map((l) => l.patient.id);
  const checkIns = await prisma.checkIn.findMany({
    where: { patientId: { in: patientIds } },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    include: {
      template: { select: { id: true, name: true } },
      patient: { select: { id: true, name: true, email: true } },
      summary: true,
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Patients & check-ins</h1>
      <div className="mb-6 text-neutral-600 dark:text-neutral-400">
        {links.length === 0
          ? "No patients linked. Share the app with patients so they can register and you can link them."
          : `Showing check-ins for ${links.length} patient(s).`}
      </div>
      <div className="space-y-6">
        {links.map((link) => {
          const patientCheckIns = checkIns.filter((c) => c.patientId === link.patient.id);
          return (
            <section key={link.patient.id} className="border dark:border-neutral-700 rounded-lg p-4">
              <h2 className="font-semibold">
                {link.patient.name ?? link.patient.email}
                <span className="text-sm font-normal text-neutral-500 ml-2">{link.patient.email}</span>
              </h2>
              <Link
                href={`/dashboard/doctor/patients/${link.patient.id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View patient details & trends
              </Link>
              <ul className="mt-3 space-y-2">
                {patientCheckIns.length === 0 ? (
                  <li className="text-sm text-neutral-500">No check-ins yet.</li>
                ) : (
                  patientCheckIns.slice(0, 5).map((c) => (
                    <li key={c.id} className="text-sm border-l-2 pl-3 dark:border-neutral-600">
                      <span className="text-neutral-500">
                        {new Date(c.scheduledAt).toLocaleDateString()} — {c.template.name} ({c.status})
                      </span>
                      {c.summary && (
                        <p className="mt-1 text-neutral-700 dark:text-neutral-300">{c.summary.medicalSummary}</p>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
