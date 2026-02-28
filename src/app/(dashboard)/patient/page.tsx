import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StartCheckInButton } from "@/components/StartCheckInButton";

export default async function PatientDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId: userId },
    orderBy: { scheduledAt: "desc" },
    include: {
      template: { select: { id: true, name: true } },
      summary: true,
    },
  });

  const assignments = await prisma.journalAssignment.findMany({
    where: { patientId: userId, active: true },
    include: { template: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My check-ins</h1>
      {assignments.length > 0 ? (
        <div className="mb-6">
          <StartCheckInButton templateId={assignments[0].template.id} />
        </div>
      ) : (
        <p className="mb-6 text-neutral-600 dark:text-neutral-400">No journal assigned. Ask your doctor to assign one.</p>
      )}
      <ul className="space-y-3">
        {checkIns.length === 0 ? (
          <li className="text-neutral-600 dark:text-neutral-400">No check-ins yet.</li>
        ) : (
          checkIns.map((c) => (
            <li key={c.id} className="border dark:border-neutral-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{c.template.name}</span>
                  <span className="text-neutral-500 text-sm ml-2">
                    {new Date(c.scheduledAt).toLocaleDateString()} — {c.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/patient/chat?id=${c.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {c.status === "completed" ? "View" : "Continue"}
                  </Link>
                  <Link
                    href={`/dashboard/patient/check-ins/${c.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Data
                  </Link>
                </div>
              </div>
              {c.summary && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                  {c.summary.medicalSummary}
                </p>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

