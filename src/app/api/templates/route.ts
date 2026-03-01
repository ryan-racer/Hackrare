import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const sessionWithUser = await getSessionWithUser(req);
  if (!sessionWithUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await prisma.journalTemplate.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
}
