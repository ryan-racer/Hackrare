"use client";

import Link from "next/link";

export function Header({ email, role }: { email?: string | null; role?: string }) {
  return (
    <header className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
      <Link href={role === "doctor" ? "/doctor" : "/patient"} className="font-semibold text-stone-900">
        Symptom Journal
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-sm text-stone-600">{email}</span>
        <Link
          href="/auth/logout"
          className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
