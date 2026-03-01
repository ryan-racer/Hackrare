"use client";

import { useState } from "react";
import Link from "next/link";

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

type Event = { name: string; notes?: string };

type ExtractionEntry = {
  id: string;
  title: string | null;
  createdAt: string;
  extractedData: string | null;
};

function SymptomRow({ s }: { s: Symptom }) {
  const [open, setOpen] = useState(false);

  const detailItems: { label: string; value: string }[] = [
    s.character ? { label: "Character", value: s.character } : null,
    s.severity != null ? { label: "Severity", value: `${s.severity}/10` } : null,
    s.duration ? { label: "Duration", value: s.duration } : null,
    s.onset ? { label: "Onset", value: s.onset } : null,
    s.location ? { label: "Location", value: s.location } : null,
    s.radiation ? { label: "Radiates to", value: s.radiation } : null,
    s.frequency ? { label: "Frequency", value: s.frequency } : null,
    s.triggers ? { label: "Triggers", value: s.triggers } : null,
    s.alleviating ? { label: "Relieved by", value: s.alleviating } : null,
    s.associated ? { label: "Associated", value: s.associated } : null,
    s.dailyImpact ? { label: "Daily impact", value: s.dailyImpact } : null,
    s.medications ? { label: "Medications", value: s.medications } : null,
    s.notes ? { label: "Notes", value: s.notes } : null,
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
        {s.notes && <span className="text-xs text-stone-500">{s.notes}</span>}
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

type PatientJournalSectionProps = {
  recentExtractions: ExtractionEntry[];
};

export function PatientJournalSection({ recentExtractions }: PatientJournalSectionProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-stone-900">My journal</h2>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          Editable journal (add, edit, delete entries) requires a database migration. Entries from chat appear below.
        </p>
      </div>
      {recentExtractions.length === 0 ? (
        <div className="rounded-lg border border-stone-200 p-8 text-center text-stone-600 bg-white">
          <p className="text-2xl mb-2">📔</p>
          <p className="font-medium text-stone-900">No journal entries yet</p>
          <p className="text-sm mt-1 leading-relaxed">
            Chat with the AI to log symptoms — they&apos;ll appear here.
          </p>
          <Link
            href="/patient"
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
                  {chat.title ?? "Chat"} — {new Date(chat.createdAt).toLocaleString()}
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
  );
}
