import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWithUser } from "@/lib/auth0";

export default async function RegisterPage() {
  const sessionWithUser = await getSessionWithUser();
  if (sessionWithUser) {
    if (sessionWithUser.user.role === "doctor") redirect("/doctor");
    redirect("/patient");
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Sign up with Auth0 to create your account.
        </p>
        <a
          href="/auth/login?screen_hint=signup"
          className="w-full px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 text-center"
        >
          Sign up
        </a>
        <Link href="/login" className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline">
          Already have an account? Log in
        </Link>
      </div>
    </div>
  );
}
