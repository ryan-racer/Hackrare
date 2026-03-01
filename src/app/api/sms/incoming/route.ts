import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { generalChatReply } from "@/lib/llm/general-chat";

const MessagingResponse = twilio.twiml.MessagingResponse;

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const from = body.get("From") as string;
  const content = (body.get("Body") as string)?.trim();

  const twiml = new MessagingResponse();

  const patient = await prisma.user.findUnique({ where: { phone: from } });
  if (!patient) {
    twiml.message("Sorry, we couldn't find an account linked to this number. Please register on the app.");
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  let chat = await prisma.generalChat.findFirst({
    where: { patientId: patient.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!chat) {
    chat = await prisma.generalChat.create({
      data: {
        patientId: patient.id,
        messages: {
          create: {
            role: "assistant",
            content: "Hi! I'm here to help you track how you're feeling. What's on your mind today?",
          },
        },
      },
    });
  }

  const history = await prisma.generalChatMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  await prisma.generalChatMessage.create({
    data: { chatId: chat.id, role: "user", content },
  });

  const { reply, extractedData } = await generalChatReply(
    history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    content
  );

  await prisma.generalChatMessage.create({
    data: { chatId: chat.id, role: "assistant", content: reply },
  });

  if (extractedData) {
    const existing = chat.extractedData
      ? JSON.parse(chat.extractedData)
      : { symptoms: [], events: [] };
    const merged = {
      symptoms: [...(existing.symptoms ?? []), ...((extractedData.symptoms as unknown[]) ?? [])],
      events: [...(existing.events ?? []), ...((extractedData.events as unknown[]) ?? [])],
    };
    const title = chat.title ?? (merged.symptoms[0] as { name?: string })?.name ?? null;
    await prisma.generalChat.update({
      where: { id: chat.id },
      data: { extractedData: JSON.stringify(merged), title, updatedAt: new Date() },
    });
  }

  twiml.message(reply);
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}