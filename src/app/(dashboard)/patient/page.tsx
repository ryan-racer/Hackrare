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

  const [user, recentExtractions] = await Promise.all([
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
      />
    </div>
  );
}
