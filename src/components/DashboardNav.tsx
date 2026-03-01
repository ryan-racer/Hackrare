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
    { key: "home", label: "Home", href: "/patient" },
    { key: "checkins", label: "Check-ins", href: "/patient?tab=checkins" },
    { key: "chat", label: "Chat", href: "/patient?tab=chat" },
    { key: "journal", label: "Journal", href: "/patient?tab=journal" },
  ];

  const isPatientPage = pathname === "/patient";
  const activeKey = isPatientPage ? (tab === "checkins" || tab === "chat" || tab === "journal" ? tab : "home") : "";

  return (
    <nav className="w-52 border-r border-stone-200 bg-white p-6 flex flex-col gap-1">
      {patientTabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`text-sm px-3 py-2.5 rounded-lg transition-colors ${
            activeKey === t.key
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
