"use client";

import Link from "next/link";

export function Header({ email, role }: { email?: string | null; role?: string }) {
  return (
    <header className="border-b dark:border-neutral-700 px-4 py-3 flex items-center justify-between">
      <Link href={role === "doctor" ? "/doctor" : "/patient"} className="font-semibold">
        Symptom Journal
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{email}</span>
        <Link
          href="/auth/logout"
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
