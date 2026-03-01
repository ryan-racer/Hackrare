import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StartCheckInButton } from "@/components/StartCheckInButton";
import { GeneralChatSection } from "@/components/GeneralChatSection";

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

  const recentExtractions = await prisma.generalChat.findMany({
    where: { patientId: userId, NOT: { extractedData: null } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, createdAt: true, extractedData: true },
  });

  return (
    <div className="space-y-8">
      {/* General AI chat — always available */}
      <section>
        <GeneralChatSection />
      </section>

      <hr className="dark:border-neutral-700" />

      {recentExtractions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Symptoms logged by AI</h2>
          <div className="space-y-3">
            {recentExtractions.map((chat: { id: string; title: string | null; createdAt: Date; extractedData: string | null }) => {
              const data = JSON.parse(chat.extractedData!) as {
                symptoms: { name: string; severity?: number; duration?: string; onset?: string; notes?: string }[];
                events: { name: string; notes?: string }[];
              };
              return (
                <div key={chat.id} className="border dark:border-neutral-700 rounded-lg p-4">
                  <p className="text-xs text-neutral-400 mb-2">
                    {chat.title ?? "Chat"} — {new Date(chat.createdAt).toLocaleString()}
                  </p>
                  {data.symptoms?.map((s, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium">{s.name}</span>
                      {s.severity != null && <span className="text-neutral-500 ml-2">· severity {s.severity}/10</span>}
                      {s.duration && <span className="text-neutral-500 ml-2">· {s.duration}</span>}
                      {s.notes && <span className="text-neutral-400 ml-2 text-xs">· {s.notes}</span>}
                    </p>
                  ))}
                  {data.events?.map((e, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium">{e.name}</span>
                      {e.notes && <span className="text-neutral-500 ml-2">· {e.notes}</span>}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <hr className="dark:border-neutral-700" />

      <section>
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
          checkIns.map((c: { id: string; scheduledAt: Date; status: string; template: { name: string }; summary?: { medicalSummary: string } | null }) => (
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
                    href={`/patient/chat?id=${c.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {c.status === "completed" ? "View" : "Continue"}
                  </Link>
                  <Link
                    href={`/patient/check-ins/${c.id}`}
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
      </section>
    </div>
  );
}

