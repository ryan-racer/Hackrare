"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Insight = { id: string; content: string; createdAt: Date | string };

export function AIInsightSection({
  patientId,
  initialInsights,
}: {
  patientId: string;
  initialInsights: Insight[];
}) {
  const queryClient = useQueryClient();
  const { data: insights = initialInsights } = useQuery<Insight[]>({
    queryKey: ["insights", patientId],
    initialData: initialInsights,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/insight`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/insight`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", patientId] });
    },
  });

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50"
      >
        {generate.isPending ? "Generating…" : "Generate AI trend analysis"}
      </button>
      {generate.isError && (
        <p className="text-red-600 text-sm">{(generate.error as Error).message}</p>
      )}
      <ul className="space-y-3">
        {insights.map((i: Insight) => (
          <li
            key={i.id}
            className="rounded-lg bg-neutral-100 dark:bg-neutral-800 p-4 border dark:border-neutral-700"
          >
            <p className="text-sm text-neutral-500 mb-1">
              {new Date(i.createdAt).toLocaleString()}
            </p>
            <p className="text-neutral-800 dark:text-neutral-200">{i.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
