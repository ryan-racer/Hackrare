"use client";

import Link from "next/link";

export function DashboardNav({ role }: { role?: string }) {
  if (role === "doctor") {
    return (
      <nav className="w-48 border-r dark:border-neutral-700 p-4 flex flex-col gap-2">
        <Link href="/dashboard/doctor" className="text-sm font-medium hover:underline">
          Patients & check-ins
        </Link>
      </nav>
    );
  }
  return (
    <nav className="w-48 border-r dark:border-neutral-700 p-4 flex flex-col gap-2">
      <Link href="/dashboard/patient" className="text-sm font-medium hover:underline">
        My check-ins
      </Link>
      <Link href="/dashboard/patient/chat" className="text-sm font-medium hover:underline">
        Chat
      </Link>
    </nav>
  );
}
