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
      <div className="rounded-lg border dark:border-neutral-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800">
            <tr>
              <th className="text-left p-2 font-medium">Field</th>
              <th className="text-left p-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-4 text-neutral-500">
                  No data yet (complete the chat to fill this).
                </td>
              </tr>
            ) : (
              entries.map(([key, value]) => (
                <tr key={key} className="border-t dark:border-neutral-700">
                  <td className="p-2 font-medium">{key}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={String(value ?? "")}
                      onChange={(e) =>
                        setRawData((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full rounded px-2 py-1 border dark:bg-neutral-900 dark:border-neutral-700"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
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
          className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
