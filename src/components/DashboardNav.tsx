"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export function DashboardNav({ role }: { role?: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab = searchParams.get("tab") ?? "chat";

  if (role === "doctor") {
    return (
      <nav className="w-48 border-r dark:border-neutral-700 p-4 flex flex-col gap-2">
        <Link href="/doctor" className="text-sm font-medium hover:underline">
          Patients &amp; check-ins
        </Link>
      </nav>
    );
  }

  const patientTabs = [
    { key: "chat", label: "Chat with AI" },
    { key: "symptoms", label: "Symptoms logged" },
    { key: "checkins", label: "Check-ins" },
  ];

  const isPatientPage = pathname === "/patient";

  return (
    <nav className="w-48 border-r dark:border-neutral-700 p-4 flex flex-col gap-1">
      {patientTabs.map((t) => (
        <Link
          key={t.key}
          href={`/patient?tab=${t.key}`}
          className={`text-sm px-3 py-2 rounded-lg transition-colors ${
            isPatientPage && tab === t.key
              ? "bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-white"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
