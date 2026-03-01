"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Alert = {
  id: string;
  severity: "info" | "watch" | "urgent";
  title: string;
  message: string;
  resolved: boolean;
  createdAt: string;
};

const severityConfig = {
  urgent: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "🚨",
    titleClass: "text-red-800 font-semibold",
    msgClass: "text-red-700",
    pillBg: "bg-red-100 text-red-700 border-red-200",
  },
  watch: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "⚠️",
    titleClass: "text-amber-800 font-semibold",
    msgClass: "text-amber-700",
    pillBg: "bg-amber-100 text-amber-700 border-amber-200",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "ℹ️",
    titleClass: "text-blue-800 font-medium",
    msgClass: "text-blue-700",
    pillBg: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

export function AlertBanner({
  patientId,
  compact = false,
}: {
  patientId: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts", patientId],
    queryFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/alerts`);
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 60_000, // re-check every minute
  });

  const unresolved = alerts.filter((a) => !a.resolved);

  const resolve = useMutation({
    mutationFn: async (alertId: string) => {
      const r = await fetch(`/api/patients/${patientId}/alerts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!r.ok) throw new Error("Failed to resolve");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", patientId] }),
  });

  const resolveAll = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/patients/${patientId}/alerts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolveAll: true }),
      });
      if (!r.ok) throw new Error("Failed to resolve");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", patientId] }),
  });

  if (unresolved.length === 0) return null;

  // Sort: urgent first, then watch, then info
  const sorted = [...unresolved].sort((a, b) => {
    const order = { urgent: 0, watch: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  if (compact) {
    // Show only the highest severity count as a badge
    const urgent = sorted.filter((a) => a.severity === "urgent").length;
    const watch = sorted.filter((a) => a.severity === "watch").length;
    return (
      <div className="flex items-center gap-1.5">
        {urgent > 0 && (
          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
            🚨 {urgent}
          </span>
        )}
        {watch > 0 && (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            ⚠️ {watch}
          </span>
        )}
        {urgent === 0 && watch === 0 && unresolved.length > 0 && (
          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
            ℹ️ {unresolved.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 mb-6">
      {sorted.map((alert) => {
        const cfg = severityConfig[alert.severity];
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border}`}
          >
            <span className="text-lg shrink-0 mt-0.5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm ${cfg.titleClass}`}>{alert.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${cfg.pillBg}`}>
                  {alert.severity}
                </span>
              </div>
              <p className={`text-sm mt-0.5 ${cfg.msgClass}`}>{alert.message}</p>
              <p className="text-xs text-stone-400 mt-1">
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => resolve.mutate(alert.id)}
              disabled={resolve.isPending}
              className="text-xs text-stone-400 hover:text-stone-700 shrink-0 transition-colors mt-0.5"
              title="Dismiss"
            >
              Dismiss
            </button>
          </div>
        );
      })}
      {unresolved.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={() => resolveAll.mutate()}
            disabled={resolveAll.isPending}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
