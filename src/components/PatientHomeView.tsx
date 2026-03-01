"use client";

import { useState } from "react";
import { PatientInfoCard } from "@/components/PatientInfoCard";
import { GeneralChatSection } from "@/components/GeneralChatSection";
import type { User } from "@prisma/client";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_2_days", label: "Every 2 days" },
  { value: "weekly", label: "Weekly" },
] as const;

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
};

export function PatientHomeView({ user }: PatientHomeViewProps) {
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
      </div>

      <div className="flex flex-col min-h-0 rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden p-5">
        <GeneralChatSection />
      </div>
    </div>
  );
}
