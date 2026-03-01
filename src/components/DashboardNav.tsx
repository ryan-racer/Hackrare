"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export function DashboardNav({ role }: { role?: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab = searchParams.get("tab") ?? "home";

  if (role === "doctor") {
    return (
      <nav className="w-52 border-r border-stone-200 bg-white p-6 flex flex-col gap-2">
        <Link href="/doctor" className="text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors">
          Patients &amp; check-ins
        </Link>
      </nav>
    );
  }

  const patientTabs = [
    { key: "home", label: "Home" },
    { key: "journal", label: "Journal" },
  ];

  const isPatientPage = pathname === "/patient";

  return (
    <nav className="w-52 border-r border-stone-200 bg-white p-6 flex flex-col gap-1">
      {patientTabs.map((t) => (
        <Link
          key={t.key}
          href={t.key === "home" ? "/patient" : "/patient?tab=journal"}
          className={`text-sm px-3 py-2.5 rounded-lg transition-colors ${
            isPatientPage && tab === t.key
              ? "bg-stone-100 font-semibold text-stone-900"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
