// import Link from "next/link";
// import { getSessionWithUser } from "@/lib/auth0";
// import { prisma } from "@/lib/db";
// import { CreatePatientForm } from "@/components/CreatePatientForm";

// export default async function DoctorDashboardPage() {
//   const sessionWithUser = await getSessionWithUser();
//   const doctorId = sessionWithUser?.user.id;
//   if (!doctorId) return null;

//   const links = await prisma.patientDoctor.findMany({
//     where: { doctorId },
//     include: {
//       patient: {
//         select: { id: true, name: true, email: true },
//       },
//     },
//   });

//   const patientIds = links.map((l: { patient: { id: string } }) => l.patient.id);
//   const checkIns = await prisma.checkIn.findMany({
//     where: { patientId: { in: patientIds } },
//     orderBy: { scheduledAt: "desc" },
//     take: 50,
//     include: {
//       template: { select: { id: true, name: true } },
//       patient: { select: { id: true, name: true, email: true } },
//       summary: true,
//     },
//   });

//   return (
//     <div>
//       <div className="flex items-center justify-between mb-6">
//         <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Patients &amp; check-ins</h1>
//         <CreatePatientForm />
//       </div>
//       <p className="mb-8 text-stone-600">
//         {links.length === 0
//           ? "No patients linked yet. Use \"Add patient\" to register a patient."
//           : `Showing check-ins for ${links.length} patient(s).`}
//       </p>
//       <div className="space-y-6">
//         {links.map((link: { patient: { id: string; name: string | null; email: string | null } }) => {
//           const patientCheckIns = checkIns.filter((c: { patientId: string }) => c.patientId === link.patient.id);
//           return (
//             <section key={link.patient.id} className="border border-stone-200 rounded-lg p-6 bg-white">
//               <h2 className="font-semibold text-stone-900">
//                 {link.patient.name ?? link.patient.email}
//                 <span className="text-sm font-normal text-stone-500 ml-2">{link.patient.email}</span>
//               </h2>
//               <Link
//                 href={`/doctor/patients/${link.patient.id}`}
//                 className="text-sm text-stone-700 hover:text-stone-900 transition-colors mt-1 inline-block"
//               >
//                 View patient details & trends
//               </Link>
//               <ul className="mt-4 space-y-2">
//                 {patientCheckIns.length === 0 ? (
//                   <li className="text-sm text-stone-500">No check-ins yet.</li>
//                 ) : (
//                   patientCheckIns.slice(0, 5).map((c: { id: string; scheduledAt: Date; template: { name: string }; status: string; summary?: { medicalSummary: string } | null }) => (
//                     <li key={c.id} className="text-sm border-l-2 border-stone-200 pl-3">
//                       <span className="text-stone-500">
//                         {new Date(c.scheduledAt).toLocaleDateString()} — {c.template.name} ({c.status})
//                       </span>
//                       {c.summary && (
//                         <p className="mt-1 text-stone-700 leading-relaxed">{c.summary.medicalSummary}</p>
//                       )}
//                     </li>
//                   ))
//                 )}
//               </ul>
//             </section>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

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

  const totalCheckIns = checkIns.length;
  const lastCheckInDate = checkIns[0]?.scheduledAt ?? null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-50 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Provider workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Patients &amp; check-ins
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              {links.length === 0
                ? "Start by registering your first patient."
                : `You’re currently following ${links.length} patient${
                    links.length === 1 ? "" : "s"
                  }.`}
            </p>
          </div>
          <div className="shrink-0">
            <CreatePatientForm />
          </div>
        </header>

        {/* Top summary cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-xs font-medium text-stone-500">Active patients</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{links.length}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-xs font-medium text-stone-500">Recent check-ins</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{totalCheckIns}</p>
            {lastCheckInDate && (
              <p className="mt-1 text-xs text-stone-500">
                Last check-in on {new Date(lastCheckInDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-3.5 text-stone-50 shadow-sm">
            <p className="text-xs font-medium text-stone-300">Next steps</p>
            <p className="mt-1 text-sm text-stone-50">
              Add a patient, then open their profile to see AI summaries and trends.
            </p>
          </div>
        </section>

        {/* Main content */}
        {links.length === 0 ? (
          // Empty state
          <section className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/60">
            <div className="max-w-md text-center">
              <p className="text-sm font-medium text-stone-900">No patients yet</p>
              <p className="mt-2 text-sm text-stone-600">
                Use “Add patient” to register your first patient and start tracking their
                symptom history over time.
              </p>
            </div>
          </section>
        ) : (
          // Patients list
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Patient list
              </h2>
              <p className="text-xs text-stone-500">
                Showing {links.length} patient{links.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <ul className="divide-y divide-stone-100">
                {links.map(
                  (link: {
                    patient: { id: string; name: string | null; email: string | null };
                  }) => {
                    const patientCheckIns = checkIns.filter(
                      (c: { patientId: string }) => c.patientId === link.patient.id,
                    );
                    const latestCheckIn = patientCheckIns[0];

                    return (
                      <li
                        key={link.patient.id}
                        className="group flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-stone-900">
                                {link.patient.name ?? link.patient.email}
                              </p>
                              <p className="text-xs text-stone-500">{link.patient.email}</p>
                            </div>
                            {latestCheckIn && (
                              <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                                Last check-in{" "}
                                {new Date(latestCheckIn.scheduledAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-xs text-stone-500">
                            {patientCheckIns.length === 0 ? (
                              <span>No check-ins yet.</span>
                            ) : (
                              <span>
                                {patientCheckIns.length} total check-in
                                {patientCheckIns.length === 1 ? "" : "s"} (
                                {Math.min(patientCheckIns.length, 5)} shown below)
                              </span>
                            )}
                          </div>

                          {patientCheckIns.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {patientCheckIns
                                .slice(0, 3)
                                .map(
                                  (c: {
                                    id: string;
                                    scheduledAt: Date;
                                    template: { name: string };
                                    status: string;
                                    summary?: { medicalSummary: string } | null;
                                  }) => (
                                    <li
                                      key={c.id}
                                      className="text-xs text-stone-600"
                                    >
                                      <span className="font-medium text-stone-800">
                                        {c.template.name}
                                      </span>{" "}
                                      ·{" "}
                                      <span>
                                        {new Date(c.scheduledAt).toLocaleDateString()} —{" "}
                                        {c.status}
                                      </span>
                                      {c.summary && (
                                        <span className="ml-1 text-stone-500">
                                          · {c.summary.medicalSummary}
                                        </span>
                                      )}
                                    </li>
                                  ),
                                )}
                            </ul>
                          )}
                        </div>

                        <div className="sm:self-stretch sm:border-l sm:border-stone-100 sm:pl-4">
                          <Link
                            href={`/doctor/patients/${link.patient.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-900 transition-colors group-hover:border-stone-900 group-hover:bg-stone-900 group-hover:text-stone-50"
                          >
                            View patient details
                          </Link>
                        </div>
                      </li>
                    );
                  },
                )}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}