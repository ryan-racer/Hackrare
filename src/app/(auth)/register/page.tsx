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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Create account</h1>
        <p className="text-stone-600 leading-relaxed">
          Sign up with Auth0 to create your account.
        </p>
        <a
          href="/auth/login?screen_hint=signup"
          className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 active:bg-stone-700 transition-colors"
        >
          Sign up
        </a>
        <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
          Already have an account? Log in
        </Link>
      </div>
    </div>
  );
}
