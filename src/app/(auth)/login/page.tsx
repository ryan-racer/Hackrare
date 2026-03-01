import Link from "next/link";
import { getSessionWithUser } from "@/lib/auth0";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const sessionWithUser = await getSessionWithUser();
  if (sessionWithUser) {
    if (sessionWithUser.user.role === "doctor") redirect("/doctor");
    redirect("/patient");
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Sign in with your account to continue.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/auth/login"
            className="w-full px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 text-center"
          >
            Log in
          </a>
          <a
            href="/auth/login?screen_hint=signup"
            className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-center"
          >
            Sign up
          </a>
        </div>
        <Link href="/" className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
