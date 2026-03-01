import { getSessionWithUser } from "@/lib/auth0";
import { redirect } from "next/navigation";

/**
 * Ensure only doctors can access /doctor/*. Patients are redirected to their dashboard.
 */
export default async function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionWithUser = await getSessionWithUser();
  if (!sessionWithUser) redirect("/login");
  if (sessionWithUser.user.role === "patient") redirect("/patient");
  return <>{children}</>;
}
