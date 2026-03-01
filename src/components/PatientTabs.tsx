"use client";

import { PatientHomeView } from "@/components/PatientHomeView";
import { PatientJournalSection } from "@/components/PatientJournalSection";
import { StartCheckInButton } from "@/components/StartCheckInButton";
import { GeneralChatSection } from "@/components/GeneralChatSection";
import Link from "next/link";
import type { User } from "@prisma/client";

type ExtractionEntry = {
  id: string;
  title: string | null;
  createdAt: string;
  extractedData: string | null;
};

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

type Props = {
  activeTab: "home" | "checkins" | "chat" | "journal";
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
  recentExtractions: ExtractionEntry[];
  checkIns: CheckInEntry[];
  assignments: AssignmentEntry[];
};



export function PatientTabs({
  activeTab,
  user,
  recentExtractions,
  checkIns,
  assignments,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {activeTab === "home" && (
        <div className="flex-1 min-h-0">
          <PatientHomeView user={user} />
        </div>
      )}

      {activeTab === "chat" && (
        <div className="flex-1 min-h-0 rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden p-5">
          <GeneralChatSection />
        </div>
      )}

      {activeTab === "checkins" && (
        <div className="space-y-5">
          {/* Start a check-in card */}
          <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80">
              <h2 className="text-base font-semibold text-stone-900">Start a check-in</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Log how you&apos;re feeling — your care team reviews every submission.
              </p>
            </div>
            <div className="p-5">
              {assignments.length > 0 ? (
                <div className="space-y-4">
                  {assignments.map((a) => (
                    <div key={a.templateId} className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{a.templateName}</p>
                        <p className="text-xs text-stone-500 mt-0.5">Recurring symptom check-in</p>
                      </div>
                      <StartCheckInButton templateId={a.templateId} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-600">
                  No check-in assigned yet. Ask your doctor to set one up.
                </p>
              )}
            </div>
          </div>

          {/* History card */}
          <div className="rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80">
              <h2 className="text-base font-semibold text-stone-900">Past check-ins</h2>
            </div>
            <div className="p-5">

            {checkIns.length === 0 ? (
              <p className="text-sm text-stone-500">No check-ins yet.</p>
            ) : (
              <ul className="space-y-3">
                {checkIns.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">{c.templateName}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {new Date(c.scheduledAt).toLocaleDateString()} — {c.status}
                      </p>
                      {c.summary && (
                        <p className="mt-1 text-xs text-stone-600 line-clamp-2">{c.summary}</p>
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
      )}

      {activeTab === "journal" && (
        <div className="flex-1 min-h-0">
          <PatientJournalSection recentExtractions={recentExtractions} />
        </div>
      )}
    </div>
  );
}
