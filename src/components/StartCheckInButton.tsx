"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartCheckInButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "Failed to start check-in");
        setLoading(false);
        return;
      }
      if (data.id) {
        router.push(`/patient/chat?id=${data.id}`);
        router.refresh();
      } else {
        setError("Invalid response");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
      >
        {loading ? "Starting…" : "Start new check-in"}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
