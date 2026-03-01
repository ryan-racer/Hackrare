"use client";

import { useState } from "react";
import Link from "next/link";
import { PatientInfoCard } from "@/components/PatientInfoCard";
import { GeneralChatSection } from "@/components/GeneralChatSection";
import { StartCheckInButton } from "@/components/StartCheckInButton";
import type { User } from "@prisma/client";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_2_days", label: "Every 2 days" },
  { value: "weekly", label: "Weekly" },
] as const;

type CheckInEntry = {
  id: string;
  scheduledAt: string;
  status: string;
  templateName: string;
  summary: string | null;
};

type AssignmentEntry = {
  templateId: string;
  templateName: string;
};

type PatientHomeViewProps = {
  user: Pick<
    User,
    | "name"
    | "email"
    | "pcpName"
    | "pcpCity"
    | "pcpState"
    | "currentDiagnoses"
    | "currentMedications"
    | "allergies"
  >;
  checkIns: CheckInEntry[];
  assignments: AssignmentEntry[];
};

export function PatientHomeView({ user, checkIns, assignments }: PatientHomeViewProps) {
  const [journalName, setJournalName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("09:00");
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveNote("Saving preferences requires a database migration (journal display name, SMS frequency, and preferred time are not yet stored).");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
      <div className="flex flex-col gap-6">
        <PatientInfoCard user={user} />

        <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80">
            <h2 className="text-base font-semibold text-stone-900">Check-in reminders</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              When and how often we reach out by SMS
            </p>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label htmlFor="journalName" className="block text-sm font-medium text-stone-700 mb-1.5">
                Journal name
              </label>
              <input
                id="journalName"
                name="journalName"
                type="text"
                value={journalName}
                onChange={(e) => setJournalName(e.target.value)}
                placeholder="e.g. My Migraine Journal"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-stone-200 focus:border-stone-300 outline-none transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="smsFrequency" className="block text-sm font-medium text-stone-700 mb-1.5">
                Frequency
              </label>
              <select
                id="smsFrequency"
                name="smsFrequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-stone-200 focus:border-stone-300 outline-none transition-shadow"
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="smsTime" className="block text-sm font-medium text-stone-700 mb-1.5">
                Preferred time
              </label>
              <input
                id="smsTime"
                name="smsTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-stone-200 focus:border-stone-300 outline-none transition-shadow"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 transition-colors"
            >
              Save preferences
            </button>
            {saveNote && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {saveNote}
              </p>
            )}
          </form>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80">
            <h2 className="text-base font-semibold text-stone-900">My check-ins</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Start a new check-in or review your past entries.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {assignments.length > 0 ? (
              <StartCheckInButton templateId={assignments[0].templateId} />
            ) : (
              <p className="text-sm text-stone-600">
                No journal assigned. Ask your doctor to assign one.
              </p>
            )}

            <div className="border-t border-stone-100 pt-4">
              {checkIns.length === 0 ? (
                <p className="text-sm text-stone-500">No check-ins yet.</p>
              ) : (
                <ul className="space-y-3">
                  {checkIns.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900">
                          {c.templateName}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {new Date(c.scheduledAt).toLocaleDateString()} — {c.status}
                        </p>
                        {c.summary && (
                          <p className="mt-1 text-xs text-stone-600 line-clamp-2">
                            {c.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Link
                          href={`/patient/chat?id=${c.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-900 hover:bg-stone-900 hover:text-stone-50 hover:border-stone-900 transition-colors"
                        >
                          {c.status === "completed" ? "View" : "Continue"}
                        </Link>
                        <Link
                          href={`/patient/check-ins/${c.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-400 hover:bg-stone-50 transition-colors"
                        >
                          Data
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col min-h-0 rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden p-5">
        <GeneralChatSection />
      </div>
    </div>
  );
}
