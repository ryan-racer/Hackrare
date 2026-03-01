"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RawDataEditor({
  checkInId,
  initialRawData,
  templateName,
}: {
  checkInId: string;
  initialRawData: Record<string, unknown> | null;
  templateName: string;
}) {
  const router = useRouter();
  const [rawData, setRawData] = useState<Record<string, unknown>>(initialRawData ?? {});
  const [saving, setSaving] = useState(false);
  const [reSummarize, setReSummarize] = useState(true);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/check-ins/${checkInId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawData, reSummarize }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const entries = Object.entries(rawData);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-100">
            <tr>
              <th className="text-left p-3 font-medium text-stone-900">Field</th>
              <th className="text-left p-3 font-medium text-stone-900">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-stone-500">
                  No data yet (complete the chat to fill this).
                </td>
              </tr>
            ) : (
              entries.map(([key, value]) => (
                <tr key={key} className="border-t border-stone-200">
                  <td className="p-3 font-medium text-stone-800">{key}</td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={String(value ?? "")}
                      onChange={(e) =>
                        setRawData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full rounded-lg px-2 py-1.5 border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-stone-700 text-sm">
          <input
            type="checkbox"
            checked={reSummarize}
            onChange={(e) => setReSummarize(e.target.checked)}
          />
          Re-generate summary for doctor after save
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || entries.length === 0}
          className="px-4 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
