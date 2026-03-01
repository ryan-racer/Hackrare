import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generalChatReply } from "@/lib/llm/general-chat";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: chatId } = await params;
  const chat = await prisma.generalChat.findUnique({ where: { id: chatId } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session?.user as { role?: string })?.role;
  if (chat.patientId !== userId && role !== "doctor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.generalChatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: chatId } = await params;
  const chat = await prisma.generalChat.findUnique({ where: { id: chatId } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.patientId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const content = (body.content as string)?.trim();
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  // Load history for context
  const history = await prisma.generalChatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Save the user message
  await prisma.generalChatMessage.create({ data: { chatId, role: "user", content } });

  // Get AI reply
  const { reply, extractedData } = await generalChatReply(
    history.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
    content
  );

  // Save assistant reply
  const assistantMsg = await prisma.generalChatMessage.create({
    data: { chatId, role: "assistant", content: reply },
  });

  // Merge extracted data into the chat record
  if (extractedData) {
    const existing = chat.extractedData ? JSON.parse(chat.extractedData) : { symptoms: [], events: [] };
    const merged = {
      symptoms: [...(existing.symptoms ?? []), ...((extractedData.symptoms as unknown[]) ?? [])],
      events: [...(existing.events ?? []), ...((extractedData.events as unknown[]) ?? [])],
    };
    // Auto-title the chat from the first extracted symptom
    const title = chat.title ?? (merged.symptoms[0] as { name?: string })?.name ?? null;
    await prisma.generalChat.update({
      where: { id: chatId },
      data: { extractedData: JSON.stringify(merged), title, updatedAt: new Date() },
    });
  }

  // Return updated full message list
  const allMessages = await prisma.generalChatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return NextResponse.json(allMessages);
}
