import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { PatientTabs } from "@/components/PatientTabs";
import { AlertBanner } from "@/components/AlertBanner";

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sessionWithUser = await getSessionWithUser();
  const userId = sessionWithUser?.user.id;
  if (!userId) return null;

  const { tab } = await searchParams;
  const activeTab = tab === "journal" ? "journal" : "home";

  const [user, recentExtractions, checkIns, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        pcpName: true,
        pcpCity: true,
        pcpState: true,
        currentDiagnoses: true,
        currentMedications: true,
        allergies: true,
      },
    }),
    prisma.generalChat.findMany({
      where: { patientId: userId, NOT: { extractedData: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, createdAt: true, extractedData: true },
    }),
    prisma.checkIn.findMany({
      where: { patientId: userId },
      orderBy: { scheduledAt: "desc" },
      include: {
        template: { select: { name: true } },
        summary: true,
      },
    }),
    prisma.journalAssignment.findMany({
      where: { patientId: userId, active: true },
      include: { template: { select: { id: true, name: true } } },
    }),
  ]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mb-6 shrink-0">
        My Health
      </h1>
      <AlertBanner patientId={userId} />
      <PatientTabs
        activeTab={activeTab}
        user={user}
        recentExtractions={recentExtractions.map((c: { id: string; title: string | null; createdAt: Date; extractedData: string | null }) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        checkIns={checkIns.map((c: {
          id: string;
          scheduledAt: Date;
          status: string;
          template: { name: string };
          summary?: { medicalSummary: string } | null;
        }) => ({
          id: c.id,
          scheduledAt: c.scheduledAt.toISOString(),
          status: c.status,
          templateName: c.template.name,
          summary: c.summary?.medicalSummary ?? null,
        }))}
        assignments={assignments.map((a: {
          template: { id: string; name: string };
        }) => ({
          templateId: a.template.id,
          templateName: a.template.name,
        }))}
      />
    </div>
  );
}
