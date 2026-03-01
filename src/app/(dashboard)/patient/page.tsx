import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PatientTabs } from "@/components/PatientTabs";

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
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
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">My Health</h1>
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
