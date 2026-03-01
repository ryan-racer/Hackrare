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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Log in</h1>
        <p className="text-stone-600 leading-relaxed">
          Sign in with your account to continue.
        </p>
        <div className="flex flex-col gap-4">
          <a
            href="/auth/login"
            className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 active:bg-stone-700 transition-colors"
          >
            Log in
          </a>
          <a
            href="/auth/login?screen_hint=signup"
            className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 hover:border-stone-400 transition-colors"
          >
            Sign up
          </a>
        </div>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
          Back to home
        </Link>
      </div>
    </div>
  );
}
