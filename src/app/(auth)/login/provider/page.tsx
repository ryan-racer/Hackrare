import { getSessionWithUser } from "@/lib/auth0";
import { redirect } from "next/navigation";

/**
 * Provider login entry point. If already logged in, redirect by role.
 * Otherwise redirect to Auth0 login.
 */
export default async function ProviderLoginPage() {
  const sessionWithUser = await getSessionWithUser();
  if (sessionWithUser) {
    if (sessionWithUser.user.role === "doctor") redirect("/doctor");
    redirect("/patient");
  }
  redirect("/auth/login?returnTo=/api/auth/complete-provider-signup");
}
