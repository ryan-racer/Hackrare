import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import {
  INBOUND_QUEUE_NAME,
  type InboundJobData,
} from "@/lib/queue/inbound-queue";
import { handleInboundMessage, sendReply } from "@/lib/messaging/handle-inbound";
import { prisma } from "@/lib/db";

/**
 * Background worker for inbound Twilio messages.
 *
 * The webhook acks Twilio immediately and drops the message here, so this
 * process owns the slow work: calling OpenAI and delivering the reply over the
 * Twilio REST API. Run it as a separate long-lived service (`npm run worker`).
 */

if (!process.env.REDIS_URL) {
  console.error(
    "[worker] REDIS_URL is not set — there is no queue to consume. Exiting."
  );
  process.exit(1);
}

if (!process.env.TWILIO_TEXT_FROM) {
  console.warn(
    "[worker] TWILIO_TEXT_FROM is not set — SMS replies will fail to deliver."
  );
}
if (!process.env.TWILIO_WHATSAPP_FROM) {
  console.warn(
    "[worker] TWILIO_WHATSAPP_FROM is not set — WhatsApp replies will fail to deliver."
  );
}

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);

async function processInbound(job: Job<InboundJobData>): Promise<void> {
  const { channel, from, messageSid } = job.data;
  const tag = `[worker] ${channel} ${messageSid ?? job.id}`;

  // If a previous attempt already produced a reply and only the send failed,
  // reuse it — regenerating would double-write the conversation history.
  let reply = job.data.generatedReply;

  if (!reply) {
    const startedAt = Date.now();
    reply = await handleInboundMessage(job.data);
    console.log(`${tag} generated reply in ${Date.now() - startedAt}ms`);
    await job.updateData({ ...job.data, generatedReply: reply });
  } else {
    console.log(`${tag} reusing reply from a previous attempt`);
  }

  await sendReply(channel, from, reply);
  console.log(`${tag} delivered`);
}

const worker = new Worker<InboundJobData>(
  INBOUND_QUEUE_NAME,
  processInbound,
  {
    connection: getRedisConnection(),
    concurrency,
    // OpenAI calls can run long; don't let another worker steal the job while
    // this one is still legitimately waiting on the API.
    lockDuration: 120_000,
  }
);

worker.on("failed", (job, err) => {
  console.error(
    `[worker] job ${job?.id ?? "unknown"} failed (attempt ${job?.attemptsMade ?? "?"}):`,
    err.message
  );
});

worker.on("error", (err) => {
  console.error("[worker] error:", err.message);
});

console.log(
  `[worker] listening on "${INBOUND_QUEUE_NAME}" with concurrency ${concurrency}`
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received, finishing in-flight jobs…`);
  // Not forced: let active jobs complete so a patient's reply isn't stranded.
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
