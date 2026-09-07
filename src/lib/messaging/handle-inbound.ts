import { prisma } from "@/lib/db";
import { generalChatReply } from "@/lib/llm/general-chat";
import { processCheckInReply } from "@/lib/check-in/process-reply";
import { sendSmsMessage } from "@/lib/sms/send";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

export type Channel = "sms" | "whatsapp";

export type InboundMessage = {
  channel: Channel;
  /** E.164 phone number, already normalized (no `whatsapp:` prefix) */
  from: string;
  body: string;
  /** Twilio MessageSid, used as the queue job id for deduplication */
  messageSid?: string;
};

/** Normalize a Twilio From (e.g. `whatsapp:+15551234567`) to E.164 for DB lookup */
export function normalizePhone(from: string): string {
  return from.replace(/^whatsapp:/i, "").trim();
}

/**
 * Send an outbound reply on the same channel the message arrived on.
 *
 * Throws when the channel's from-number is missing. The underlying helpers
 * skip silently, which is fine for fire-and-forget notifications but not here:
 * this send *is* the patient's reply, so a misconfiguration must fail the job
 * loudly rather than swallow the message.
 */
export async function sendReply(
  channel: Channel,
  to: string,
  body: string
): Promise<void> {
  if (channel === "whatsapp") {
    if (!process.env.TWILIO_WHATSAPP_FROM) {
      throw new Error(
        "TWILIO_WHATSAPP_FROM is not set — cannot deliver the WhatsApp reply"
      );
    }
    await sendWhatsAppMessage(to, body);
  } else {
    if (!process.env.TWILIO_TEXT_FROM) {
      throw new Error(
        "TWILIO_TEXT_FROM is not set — cannot deliver the SMS reply"
      );
    }
    await sendSmsMessage(to, body);
  }
}

/**
 * Handle an inbound patient message and produce the reply text.
 *
 * This is the slow path — it calls OpenAI and can take far longer than Twilio's
 * 15s webhook timeout, so it must never run inside a webhook request. The
 * webhook enqueues; the worker calls this and delivers the result via the
 * Twilio REST API.
 *
 * Deliberately free of `next/*` imports so it can run in a plain Node worker.
 */
export async function handleInboundMessage(
  message: InboundMessage
): Promise<string> {
  const from = normalizePhone(message.from ?? "");
  if (!from) {
    return "Invalid sender. Please try again.";
  }

  const patient = await prisma.user.findUnique({ where: { phone: from } });
  if (!patient) {
    return message.channel === "whatsapp"
      ? "Sorry, we couldn't find an account linked to this number. Please register on the app and add your phone during onboarding."
      : "Sorry, we couldn't find an account linked to this number. Please register on the app.";
  }

  const trimmedContent = message.body?.trim() ?? "";
  if (!trimmedContent) {
    return "Please send a message.";
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
    return result.ok ? result.reply : result.error;
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
            content:
              "Hi! I'm here to help you track how you're feeling. What's on your mind today?",
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

  // The OpenAI call runs *before* any write so that a failure leaves no
  // partial state behind. The worker retries this whole function, and a write
  // here would duplicate the patient's message on every retry. If generation
  // fails for good, the message is still recoverable from the failed job.
  const { reply, extractedData } = await generalChatReply(
    history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    trimmedContent
  );

  // Timestamps are set explicitly: inside a transaction Postgres resolves
  // CURRENT_TIMESTAMP to the transaction start, so both rows would otherwise
  // share a createdAt and the transcript could render out of order.
  const now = new Date();
  await prisma.$transaction([
    prisma.generalChatMessage.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: trimmedContent,
        createdAt: now,
      },
    }),
    prisma.generalChatMessage.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: reply,
        createdAt: new Date(now.getTime() + 1),
      },
    }),
  ]);

  if (extractedData) {
    const existing = chat.extractedData
      ? JSON.parse(chat.extractedData)
      : { symptoms: [], events: [] };
    const merged = {
      symptoms: [
        ...(existing.symptoms ?? []),
        ...((extractedData.symptoms as unknown[]) ?? []),
      ],
      events: [
        ...(existing.events ?? []),
        ...((extractedData.events as unknown[]) ?? []),
      ],
    };
    const title =
      chat.title ?? (merged.symptoms[0] as { name?: string })?.name ?? null;
    await prisma.generalChat.update({
      where: { id: chat.id },
      data: {
        extractedData: JSON.stringify(merged),
        title,
        updatedAt: new Date(),
      },
    });
  }

  return reply;
}
