"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartCheckInButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/patient/chat?id=${data.id}`);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
    >
      {loading ? "Starting…" : "Start new check-in"}
    </button>
  );
}
