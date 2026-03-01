import Link from "next/link";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { CreatePatientForm } from "@/components/CreatePatientForm";

export default async function DoctorDashboardPage() {
  const sessionWithUser = await getSessionWithUser();
  const doctorId = sessionWithUser?.user.id;
  if (!doctorId) return null;

  const links = await prisma.patientDoctor.findMany({
    where: { doctorId },
    include: {
      patient: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const patientIds = links.map((l: { patient: { id: string } }) => l.patient.id);
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Patients &amp; check-ins</h1>
        <CreatePatientForm />
      </div>
      <div className="mb-6 text-neutral-600 dark:text-neutral-400">
        {links.length === 0
          ? "No patients linked yet. Use \"Add patient\" to register a patient."
          : `Showing check-ins for ${links.length} patient(s).`}
      </div>
      <div className="space-y-6">
        {links.map((link: { patient: { id: string; name: string | null; email: string | null } }) => {
          const patientCheckIns = checkIns.filter((c: { patientId: string }) => c.patientId === link.patient.id);
          return (
            <section key={link.patient.id} className="border dark:border-neutral-700 rounded-lg p-4">
              <h2 className="font-semibold">
                {link.patient.name ?? link.patient.email}
                <span className="text-sm font-normal text-neutral-500 ml-2">{link.patient.email}</span>
              </h2>
              <Link
                href={`/doctor/patients/${link.patient.id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View patient details & trends
              </Link>
              <ul className="mt-3 space-y-2">
                {patientCheckIns.length === 0 ? (
                  <li className="text-sm text-neutral-500">No check-ins yet.</li>
                ) : (
                  patientCheckIns.slice(0, 5).map((c: { id: string; scheduledAt: Date; template: { name: string }; status: string; summary?: { medicalSummary: string } | null }) => (
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
