import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doctorId = sessionWithUser.user.id;
  const role = sessionWithUser.user.role;

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  if (role !== "doctor") {
    if (patientId !== doctorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const link = await prisma.patientDoctor.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
    if (!link) return NextResponse.json({ error: "Patient not linked" }, { status: 403 });
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { patientId, status: "completed" },
    include: { response: true },
    orderBy: { scheduledAt: "asc" },
  });

  const byWeek: Record<string, { count: number; intensities: number[] }> = {};
  for (const c of checkIns) {
    if (!c.response) continue;
    const raw = JSON.parse(c.response.rawData) as Record<string, unknown>;
    const date = new Date(c.scheduledAt);
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const weekKey = start.toISOString().slice(0, 10);
    if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, intensities: [] };
    const hadHeadache = raw.hadHeadache === true || raw.hadHeadache === "yes";
    if (hadHeadache) {
      byWeek[weekKey].count += 1;
      const intensity =
        typeof raw.intensity === "number"
          ? raw.intensity
          : parseInt(String(raw.intensity), 10);
      if (!isNaN(intensity)) byWeek[weekKey].intensities.push(intensity);
    }
  }

  const weeklyTrend = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      headacheCount: data.count,
      avgIntensity:
        data.intensities.length > 0
          ? Math.round((data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length) * 10) / 10
          : null,
    }));

  return NextResponse.json({ weeklyTrend });
}
