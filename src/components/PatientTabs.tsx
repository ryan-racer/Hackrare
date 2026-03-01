"use client";

import { useState } from "react";
import Link from "next/link";
import { GeneralChatSection } from "@/components/GeneralChatSection";
import { StartCheckInButton } from "@/components/StartCheckInButton";

type Symptom = {
  name: string;
  character?: string;
  severity?: number;
  duration?: string;
  onset?: string;
  location?: string;
  radiation?: string;
  frequency?: string;
  triggers?: string;
  alleviating?: string;
  associated?: string;
  dailyImpact?: string;
  medications?: string;
  notes?: string;
};

function SymptomRow({ s }: { s: Symptom }) {
  const [open, setOpen] = useState(false);

  const detailItems: { label: string; value: string }[] = [
    s.character   ? { label: "Character",    value: s.character }   : null,
    s.severity != null ? { label: "Severity", value: `${s.severity}/10` } : null,
    s.duration    ? { label: "Duration",     value: s.duration }    : null,
    s.onset       ? { label: "Onset",        value: s.onset }       : null,
    s.location    ? { label: "Location",     value: s.location }    : null,
    s.radiation   ? { label: "Radiates to",  value: s.radiation }   : null,
    s.frequency   ? { label: "Frequency",    value: s.frequency }   : null,
    s.triggers    ? { label: "Triggers",     value: s.triggers }    : null,
    s.alleviating ? { label: "Relieved by",  value: s.alleviating } : null,
    s.associated  ? { label: "Associated",   value: s.associated }  : null,
    s.dailyImpact ? { label: "Daily impact", value: s.dailyImpact } : null,
    s.medications ? { label: "Medications",  value: s.medications } : null,
    s.notes       ? { label: "Notes",        value: s.notes }       : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-wrap items-center gap-2 text-sm w-full text-left group"
      >
        <span className="font-medium group-hover:underline">{s.name}</span>
        {s.severity != null && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600">
            {s.severity}/10
          </span>
        )}
        {s.duration && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-600">
            {s.duration}
          </span>
        )}
        {s.onset && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-600">
            onset: {s.onset}
          </span>
        )}
        {s.notes && (
          <span className="text-xs text-stone-500">{s.notes}</span>
        )}
        {detailItems.length > 0 && (
          <span className="ml-auto text-stone-400 text-xs">{open ? "▲" : "▼"}</span>
        )}
      </button>
      {open && detailItems.length > 0 && (
        <div className="mt-2 pl-1 grid grid-cols-2 gap-x-6 gap-y-1">
          {detailItems.map(({ label, value }) => (
            <div key={label} className="flex gap-1.5 text-xs">
              <span className="text-stone-400 shrink-0">{label}:</span>
              <span className="text-stone-700">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Event = { name: string; notes?: string };

type ExtractionEntry = {
  id: string;
  title: string | null;
  createdAt: string;
  extractedData: string | null;
};

type CheckIn = {
  id: string;
  scheduledAt: string;
  status: string;
  template: { name: string };
  summary?: { medicalSummary: string } | null;
};

type Props = {
  recentExtractions: ExtractionEntry[];
  checkIns: CheckIn[];
  templateId?: string;
  activeTab: TabKey;
};

const TABS = [
  { key: "chat", label: "Chat with AI" },
  { key: "symptoms", label: "Symptoms logged" },
  { key: "checkins", label: "Check-ins" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PatientTabs({ recentExtractions, checkIns, templateId, activeTab }: Props) {

  return (
    <div>
      {/* Chat tab */}
      {activeTab === "chat" && (
        <div>
          <GeneralChatSection />
        </div>
      )}

      {/* Symptoms tab */}
      {activeTab === "symptoms" && (
        <div>
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Symptoms logged by AI</h2>
          {recentExtractions.length === 0 ? (
            <div className="rounded-lg border border-stone-200 p-8 text-center text-stone-600 bg-white">
              <p className="text-2xl mb-2">🩺</p>
              <p className="font-medium text-stone-900">No symptoms logged yet</p>
              <p className="text-sm mt-1 leading-relaxed">
                Chat with the AI and describe your symptoms — they&apos;ll appear here.
              </p>
              <Link
                href="/patient?tab=chat"
                className="mt-4 inline-flex items-center justify-center px-6 py-2.5 text-sm rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-colors"
              >
                Start chatting
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentExtractions.map((chat) => {
                const data = JSON.parse(chat.extractedData!) as {
                  symptoms: Symptom[];
                  events: Event[];
                };
                return (
                  <div
                    key={chat.id}
                    className="rounded-lg border border-stone-200 p-4 bg-white"
                  >
                    <p className="text-xs text-stone-500 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block" />
                      {chat.title ?? "Chat"} &mdash;{" "}
                      {new Date(chat.createdAt).toLocaleString()}
                    </p>
                    {data.symptoms?.length > 0 && (
                      <div className="space-y-2">
                        {data.symptoms.map((s, i) => (
                          <SymptomRow key={i} s={s} />
                        ))}
                      </div>
                    )}
                    {data.events?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {data.events.map((e, i) => (
                          <div key={i} className="text-sm flex items-center gap-2">
                            <span className="font-medium text-stone-900">{e.name}</span>
                            {e.notes && (
                              <span className="text-stone-500 text-xs">{e.notes}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Check-ins tab */}
      {activeTab === "checkins" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">My check-ins</h2>
            {templateId && <StartCheckInButton templateId={templateId} />}
          </div>
          {!templateId && (
            <p className="text-sm text-stone-600 mb-4">
              No journal assigned yet — ask your doctor to assign one.
            </p>
          )}
          {checkIns.length === 0 ? (
            <div className="rounded-lg border border-stone-200 p-8 text-center text-stone-600 bg-white">
              <p className="text-2xl mb-2">📋</p>
              <p className="font-medium text-stone-900">No check-ins yet</p>
              {templateId && (
                <p className="text-sm mt-1">Click &ldquo;Start new check-in&rdquo; above to begin.</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {checkIns.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-stone-200 p-4 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-stone-900">{c.template.name}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {c.status}
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {new Date(c.scheduledAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/patient/chat?id=${c.id}`}
                        className="text-sm text-stone-700 hover:text-stone-900 transition-colors font-medium"
                      >
                        {c.status === "completed" ? "View" : "Continue"}
                      </Link>
                      <Link
                        href={`/patient/check-ins/${c.id}`}
                        className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
                      >
                        Raw data
                      </Link>
                    </div>
                  </div>
                  {c.summary && (
                    <p className="mt-2 text-sm text-stone-600 leading-relaxed line-clamp-2">
                      {c.summary.medicalSummary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
