"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Diagnosis = {
  id: string;
  diseaseLabel: string;
  diseaseId: string | null;
  confirmed: boolean;
  working: boolean;
  notes: string | null;
  createdAt: string;
  checkinTemplates: Array<{ id: string; cadence: string; createdAt: string }>;
};

function TemplateField({ field }: {
  field: {
    id: string; label: string; type: string; required: boolean;
    options?: string[]; min?: number; max?: number;
    redFlag?: boolean; hint?: string;
  }
}) {
  return (
    <div className={`flex items-start gap-2 py-1.5 border-b border-stone-100 last:border-0 ${field.redFlag ? "bg-red-50/40 -mx-3 px-3 rounded" : ""}`}>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-stone-800">{field.label}</span>
        {field.hint && <span className="text-xs text-stone-400 ml-2">{field.hint}</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {field.redFlag && <span className="text-xs text-red-500 font-medium">🚩 red-flag</span>}
        <span className={`text-xs px-1.5 py-0.5 rounded border ${
          field.type === "slider" ? "bg-blue-50 text-blue-700 border-blue-100" :
          field.type === "boolean" ? "bg-green-50 text-green-700 border-green-100" :
          field.type === "select" ? "bg-purple-50 text-purple-700 border-purple-100" :
          "bg-stone-100 text-stone-600 border-stone-200"
        }`}>
          {field.type}{field.type === "slider" ? ` ${field.min ?? 0}–${field.max ?? 10}` : ""}
        </span>
        {!field.required && <span className="text-xs text-stone-400">optional</span>}
      </div>
    </div>
  );
}

function TemplatePreview({ diagnosisId, patientId }: { diagnosisId: string; patientId: string }) {
  const { data: templates = [], isLoading } = useQuery<Array<{
    id: string; cadence: string; templateJson: string; createdAt: string;
  }>>({
    queryKey: ["checkin-templates", diagnosisId],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/diagnoses/${diagnosisId}/template`);
      if (!r.ok) throw new Error("Failed to load templates");
      return r.json();
    },
  });

  const [activeCadence, setActiveCadence] = useState<"daily" | "flare" | "weekly">("daily");

  if (isLoading) return <p className="text-xs text-stone-400 py-2">Loading templates…</p>;
  if (templates.length === 0) return null;

  const activeTemplate = templates.find((t) => t.cadence === activeCadence);
  const parsed = activeTemplate ? JSON.parse(activeTemplate.templateJson) : null;

  return (
    <div className="mt-3 border border-stone-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-stone-200 bg-stone-50">
        {(["daily", "flare", "weekly"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setActiveCadence(c)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeCadence === c
                ? "bg-white text-stone-900 border-b-2 border-stone-900 -mb-px"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {parsed && (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Est. {parsed.estimatedSeconds}s</span>
            <span>·</span>
            <span>{parsed.sections?.reduce((n: number, s: { fields: unknown[] }) => n + s.fields.length, 0)} fields</span>
          </div>
          {parsed.sections?.map((section: { title: string; fields: Parameters<typeof TemplateField>[0]["field"][] }, si: number) => (
            <div key={si}>
              <p className="text-xs font-semibold text-stone-500 uppercase mb-1">{section.title}</p>
              <div>
                {section.fields.map((f) => (
                  <TemplateField key={f.id} field={f} />
                ))}
              </div>
            </div>
          ))}
          {parsed.redFlagScreen?.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Red-flag screen</p>
              <ul className="space-y-0.5">
                {parsed.redFlagScreen.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-red-600">• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiagnosisCard({
  diagnosis,
  patientId,
}: {
  diagnosis: Diagnosis;
  patientId: string;
}) {
  const qc = useQueryClient();
  const [showTemplate, setShowTemplate] = useState(false);
  const hasTemplates = diagnosis.checkinTemplates.length > 0;

  const confirm = useMutation({
    mutationFn: async (confirmed: boolean) => {
      const r = await fetch(`/api/patients/${patientId}/diagnoses/${diagnosis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diagnoses", patientId] }),
  });

  const generateTemplate = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/diagnoses/${diagnosis.id}/template`, {
        method: "POST",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to generate");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diagnoses", patientId] });
      qc.invalidateQueries({ queryKey: ["checkin-templates", diagnosis.id] });
      setShowTemplate(true);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/diagnoses/${diagnosis.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diagnoses", patientId] }),
  });

  return (
    <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-900 text-sm">{diagnosis.diseaseLabel}</span>
            {diagnosis.diseaseId && (
              <span className="text-xs text-stone-400">{diagnosis.diseaseId}</span>
            )}
            {diagnosis.confirmed ? (
              <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">Confirmed</span>
            ) : diagnosis.working ? (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">Working diagnosis</span>
            ) : null}
          </div>
          {diagnosis.notes && (
            <p className="text-xs text-stone-500 mt-1">{diagnosis.notes}</p>
          )}
          <p className="text-xs text-stone-400 mt-1">{new Date(diagnosis.createdAt).toLocaleDateString()}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!diagnosis.confirmed && (
            <button
              onClick={() => confirm.mutate(true)}
              disabled={confirm.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Confirm
            </button>
          )}
          {diagnosis.confirmed && (
            <button
              onClick={() => confirm.mutate(false)}
              disabled={confirm.isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              Unconfirm
            </button>
          )}
          {hasTemplates ? (
            <button
              onClick={() => setShowTemplate((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors"
            >
              {showTemplate ? "Hide template" : "View template"}
            </button>
          ) : (
            <button
              onClick={() => generateTemplate.mutate()}
              disabled={generateTemplate.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {generateTemplate.isPending ? "Generating…" : "Generate check-in template"}
            </button>
          )}
          <button
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors px-1"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>

      {generateTemplate.error && (
        <p className="px-4 pb-2 text-xs text-red-600">{(generateTemplate.error as Error).message}</p>
      )}

      {showTemplate && hasTemplates && (
        <div className="px-4 pb-4">
          <TemplatePreview diagnosisId={diagnosis.id} patientId={patientId} />
        </div>
      )}
    </div>
  );
}

export function DiagnosisSection({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [diseaseId, setDiseaseId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: diagnoses = [], isLoading } = useQuery<Diagnosis[]>({
    queryKey: ["diagnoses", patientId],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/diagnoses`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/diagnoses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diseaseLabel: label.trim(),
          diseaseId: diseaseId.trim() || null,
          confirmed,
          working: !confirmed,
          notes: notes.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to add");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diagnoses", patientId] });
      setLabel(""); setDiseaseId(""); setConfirmed(false); setNotes("");
      setShowForm(false);
    },
  });

  return (
    <div>
      {isLoading && <p className="text-stone-400 text-sm">Loading…</p>}

      {!isLoading && diagnoses.length === 0 && !showForm && (
        <div className="border border-dashed border-stone-300 rounded-lg p-5 text-center mb-3">
          <p className="text-stone-500 text-sm">No diagnoses recorded yet.</p>
          <p className="text-stone-400 text-xs mt-0.5">Add a confirmed or working diagnosis to trigger Agent 4 disease-specific check-in templates.</p>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {diagnoses.map((d) => (
          <DiagnosisCard key={d.id} diagnosis={d} patientId={patientId} />
        ))}
      </div>

      {showForm ? (
        <div className="border border-stone-200 rounded-lg p-4 bg-white space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">Add diagnosis</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-600 mb-1">Disease label *</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Systemic Lupus Erythematosus"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-600 mb-1">Disease ID (optional)</label>
              <input
                value={diseaseId}
                onChange={(e) => setDiseaseId(e.target.value)}
                placeholder="e.g. ORPHA:536 or GARD:0001234"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-stone-700">Mark as confirmed diagnosis (not just working)</span>
          </label>
          {add.error && <p className="text-red-600 text-sm">{(add.error as Error).message}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => add.mutate()}
              disabled={!label.trim() || add.isPending}
              className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {add.isPending ? "Saving…" : "Add diagnosis"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-800 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors"
        >
          + Add diagnosis
        </button>
      )}
    </div>
  );
}
