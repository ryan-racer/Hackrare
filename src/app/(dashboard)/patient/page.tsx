import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { PatientTabs } from "@/components/PatientTabs";

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sessionWithUser = await getSessionWithUser();
  const userId = sessionWithUser?.user.id;
  if (!userId) return null;

  const { tab } = await searchParams;
  const activeTab = (tab === "symptoms" || tab === "checkins" ? tab : "chat") as "chat" | "symptoms" | "checkins";

  const [checkIns, assignments, recentExtractions] = await Promise.all([
    prisma.checkIn.findMany({
      where: { patientId: userId },
      orderBy: { scheduledAt: "desc" },
      include: {
        template: { select: { id: true, name: true } },
        summary: true,
      },
    }),
    prisma.journalAssignment.findMany({
      where: { patientId: userId, active: true },
      include: { template: true },
    }),
    prisma.generalChat.findMany({
      where: { patientId: userId, NOT: { extractedData: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, createdAt: true, extractedData: true },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-8">My Health</h1>
      <PatientTabs
        activeTab={activeTab}
        checkIns={checkIns.map((c: { id: string; scheduledAt: Date; status: string; template: { id: string; name: string }; summary: { medicalSummary: string } | null }) => ({
          ...c,
          scheduledAt: c.scheduledAt.toISOString(),
        }))}
        recentExtractions={recentExtractions.map((c: { id: string; title: string | null; createdAt: Date; extractedData: string | null }) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        templateId={assignments[0]?.template.id}
      />
    </div>
  );
}
