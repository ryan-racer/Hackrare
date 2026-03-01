import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { generalChatReply } from "@/lib/llm/general-chat";
import { processCheckInReply } from "@/lib/check-in/process-reply";

const MessagingResponse = twilio.twiml.MessagingResponse;

/** Normalize Twilio From (e.g. whatsapp:+15551234567) to E.164 for DB lookup */
function normalizePhone(from: string): string {
  return from.replace(/^whatsapp:/i, "").trim();
}

function twimlResponse(message: string): NextResponse {
  const twiml = new MessagingResponse();
  twiml.message(message);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const from = body.get("From") as string;
  const content = (body.get("Body") as string)?.trim();

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const url = req.url;
    const params: Record<string, string> = {};
    body.forEach((value, key) => {
      params[key] = String(value);
    });
    const isValid = twilio.validateRequest(authToken, signature, url, params);
    if (!isValid) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const normalizedFrom = normalizePhone(from ?? "");
  if (!normalizedFrom) {
    return twimlResponse("Invalid sender. Please try again.");
  }

  const patient = await prisma.user.findUnique({ where: { phone: normalizedFrom } });
  if (!patient) {
    return twimlResponse(
      "Sorry, we couldn't find an account linked to this number. Please register on the app and add your phone during onboarding."
    );
  }

  const trimmedContent = content ?? "";
  if (!trimmedContent) {
    return twimlResponse("Please send a message.");
  }

  // Route: check-in if patient has in-progress check-in with last message from assistant
  const inProgressCheckIn = await prisma.checkIn.findFirst({
    where: {
      patientId: patient.id,
      status: "in_progress",
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const lastMessage = inProgressCheckIn?.messages[0];
  const isWaitingForCheckInReply =
    lastMessage?.role === "assistant" && inProgressCheckIn;

  if (isWaitingForCheckInReply && inProgressCheckIn) {
    const result = await processCheckInReply(
      patient.id,
      inProgressCheckIn.id,
      trimmedContent
    );
    if (!result.ok) {
      return twimlResponse(result.error);
    }
    return twimlResponse(result.reply);
  }

  // General chat path
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
    data: { chatId: chat.id, role: "user", content: trimmedContent },
  });

  const { reply, extractedData } = await generalChatReply(
    history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    trimmedContent
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

  return twimlResponse(reply);
}
