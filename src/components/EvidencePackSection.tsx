"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type HpoTerm = {
  label: string;
  hpoId?: string;
  verified: boolean;
};

type CandidateCondition = {
  name: string;
  orphaCode?: string;
  matchedTerms: string[];
  discriminators: {
    strengthen: string[];
    weaken: string[];
  };
  references: Array<{
    label: string;
    url?: string;
    pmid?: string;
    verified: boolean;
  }>;
};

type Report = {
  id: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  checkinsUsed: number;
  hpoTerms: string; // JSON
  candidateConditions: string; // JSON
  reportMd: string;
};

function parseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function ConditionCard({ cond }: { cond: CandidateCondition }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-stone-900 text-sm truncate">{cond.name}</span>
          {cond.orphaCode && (
            <span className="text-xs text-stone-400 shrink-0">{cond.orphaCode}</span>
          )}
          {cond.matchedTerms?.length > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
              {cond.matchedTerms.length} matched phenotype{cond.matchedTerms.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-stone-400 text-xs shrink-0 ml-4">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-stone-100 space-y-3 pt-3">
          {cond.matchedTerms?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500 mb-1.5">Matched phenotypes</p>
              <div className="flex flex-wrap gap-1.5">
                {cond.matchedTerms.map((t) => (
                  <span key={t} className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {cond.discriminators?.strengthen?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase mb-1">Strengthens hypothesis</p>
                <ul className="space-y-1">
                  {cond.discriminators.strengthen.map((s, i) => (
                    <li key={i} className="text-xs text-stone-700 flex gap-1.5">
                      <span className="text-green-500 mt-0.5 shrink-0">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cond.discriminators?.weaken?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-1">Arguments against</p>
                <ul className="space-y-1">
                  {cond.discriminators.weaken.map((s, i) => (
                    <li key={i} className="text-xs text-stone-700 flex gap-1.5">
                      <span className="text-red-400 mt-0.5 shrink-0">−</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {cond.references?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500 mb-1">References</p>
              <ul className="space-y-1">
                {cond.references.map((r, i) => (
                  <li key={i} className="text-xs text-stone-600 flex items-start gap-1.5">
                    <span className="shrink-0">•</span>
                    <span>
                      {r.label}
                      {r.pmid && (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 hover:underline"
                        >
                          PMID {r.pmid}
                        </a>
                      )}
                      {r.url && !r.pmid && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline">
                          ↗
                        </a>
                      )}
                      {!r.verified && (
                        <span className="ml-1 text-amber-600 text-[10px]">(needs verification)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EvidencePackSection({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [showMarkdown, setShowMarkdown] = useState(false);

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["evidence-pack", patientId],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/evidence-pack`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/evidence-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to generate");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence-pack", patientId] });
      setExpanded(reports[0]?.id ?? null);
    },
  });

  const activeReport = expanded ? reports.find((r) => r.id === expanded) : reports[0];
  const hpoTerms = activeReport ? parseJson<HpoTerm[]>(activeReport.hpoTerms, []) : [];
  const conditions = activeReport ? parseJson<CandidateCondition[]>(activeReport.candidateConditions, []) : [];

  return (
    <div>
      {/* Header + controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-stone-600">Period:</label>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="text-sm border border-stone-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
        >
          {generate.isPending ? "Generating…" : "Generate Evidence Pack"}
        </button>
        {generate.error && (
          <p className="text-red-600 text-sm">{(generate.error as Error).message}</p>
        )}
      </div>

      {/* Report picker */}
      {reports.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setExpanded(r.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                (expanded ?? reports[0]?.id) === r.id
                  ? "bg-stone-800 text-white border-stone-800"
                  : "bg-white text-stone-700 border-stone-300 hover:border-stone-500"
              }`}
            >
              {new Date(r.generatedAt).toLocaleDateString()} · {r.checkinsUsed} entries
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="text-stone-400 text-sm">Loading…</p>
      )}

      {!isLoading && reports.length === 0 && !generate.isPending && (
        <div className="border border-dashed border-stone-300 rounded-lg p-6 text-center">
          <p className="text-stone-500 text-sm">No evidence pack generated yet.</p>
          <p className="text-stone-400 text-xs mt-1">Generate one to map symptoms to HPO phenotypes and surface rare disease candidates.</p>
        </div>
      )}

      {activeReport && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-400">
              Generated {new Date(activeReport.generatedAt).toLocaleString()} · {activeReport.checkinsUsed} data entries
            </p>
            <button
              onClick={() => setShowMarkdown((v) => !v)}
              className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
            >
              {showMarkdown ? "Hide raw report" : "View raw report"}
            </button>
          </div>

          {showMarkdown && (
            <pre className="text-xs bg-stone-50 border border-stone-200 rounded-lg p-4 overflow-auto whitespace-pre-wrap text-stone-700 max-h-96">
              {activeReport.reportMd}
            </pre>
          )}

          {/* HPO Terms */}
          {hpoTerms.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500 mb-2">
                Standardized Phenotypes (HPO) — {hpoTerms.length} terms
              </p>
              <div className="flex flex-wrap gap-2">
                {hpoTerms.map((t, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      t.verified
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                    title={t.hpoId ?? "HPO ID needs verification"}
                  >
                    {t.label}
                    {t.hpoId && <span className="ml-1 opacity-60">{t.hpoId}</span>}
                    {!t.verified && <span className="ml-1 opacity-50">⚠</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Candidate conditions */}
          {conditions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold uppercase text-stone-500">
                  Candidate Conditions to Consider — {conditions.length}
                </p>
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                  Not a diagnosis
                </span>
              </div>
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <ConditionCard key={i} cond={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
