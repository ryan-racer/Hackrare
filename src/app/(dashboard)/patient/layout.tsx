import { headers } from "next/headers";
import { getSessionWithUser } from "@/lib/auth0";
import { redirect } from "next/navigation";

/**
 * Ensure only patients can access /patient/*. Doctors are redirected to their dashboard.
 * If onboarding is not completed, redirect to /patient/onboarding unless already there.
 */
export default async function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionWithUser = await getSessionWithUser();
  if (!sessionWithUser) redirect("/login");
  if (sessionWithUser.user.role === "doctor") redirect("/doctor");

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onboardingCompleted = sessionWithUser.user.onboardingCompletedAt != null;
  if (!onboardingCompleted && pathname !== "/patient/onboarding") {
    redirect("/patient/onboarding");
  }

  return <>{children}</>;
}
