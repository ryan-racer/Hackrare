import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role === "doctor") redirect("/doctor");
    redirect("/patient");
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">Symptom Journal</h1>
      <p className="text-neutral-600 dark:text-neutral-400 text-center max-w-md">
        Track your symptoms with AI-assisted journaling. Your doctor gets clear, precise summaries.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Register
        </Link>
      </div>
    </div>
  );
}
