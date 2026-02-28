"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function TrendsCharts({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["trends", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/trends?patientId=${patientId}`);
      if (!res.ok) throw new Error("Failed to load trends");
      return res.json();
    },
  });

  if (isLoading) return <p className="text-neutral-500">Loading trends…</p>;
  const weekly = data?.weeklyTrend ?? [];
  if (weekly.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-2">Trends</h2>
        <p className="text-neutral-500">Complete more check-ins to see trends.</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="font-semibold text-lg mb-4">Trends</h2>
      <div className="h-64 w-full max-w-2xl">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
            <XAxis dataKey="week" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--foreground)" }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Bar dataKey="headacheCount" name="Headaches (count)" fill="rgb(59 130 246)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {weekly.some((w: { avgIntensity: number | null }) => w.avgIntensity != null) && (
        <div className="h-64 w-full max-w-2xl mt-6">
          <h3 className="text-sm font-medium mb-2">Average pain intensity by week</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly.filter((w: { avgIntensity: number | null }) => w.avgIntensity != null)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-700" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis domain={[0, 10]} className="text-xs" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--foreground)" }}
              />
              <Bar dataKey="avgIntensity" name="Avg intensity (1-10)" fill="rgb(234 88 12)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
