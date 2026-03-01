import { NextResponse } from "next/server";
import { getSessionWithUser } from "@/lib/auth0";
import { prisma } from "@/lib/db";

// POST /api/general-chat — create a new chat session
export async function POST(req: Request) {
  const sessionWithUser = await getSessionWithUser(req);
  const userId = sessionWithUser?.user.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await prisma.generalChat.create({
    data: {
      patientId: userId,
      messages: {
        create: {
          role: "assistant",
          content: "Hi! I'm here to help you track how you're feeling. What's on your mind today — any symptoms or health events you'd like to tell me about?",
        },
      },
    },
  });

  return NextResponse.json({ id: chat.id });
}

// GET /api/general-chat — list all chats for current patient
export async function GET(req: Request) {
  const sessionWithUser = await getSessionWithUser(req);
  const userId = sessionWithUser?.user.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chats = await prisma.generalChat.findMany({
    where: { patientId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json(chats);
}
