import { Queue, type JobsOptions } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/lib/queue/connection";
import type { InboundMessage } from "@/lib/messaging/handle-inbound";

export const INBOUND_QUEUE_NAME = "twilio-inbound";

export type InboundJobData = InboundMessage & {
  /**
   * Reply produced by an earlier attempt. Set by the worker once generation
   * succeeds so that a delivery failure retries only the send — regenerating
   * would write the conversation history a second time.
   */
  generatedReply?: string;
};

export const inboundJobOptions: JobsOptions = {
  // OpenAI hiccups (429s, 5xx, timeouts) are transient — retry with backoff
  // rather than dropping the patient's message.
  attempts: 5,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  // Keep failures around for a week so they can be inspected and replayed.
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

const globalForQueue = globalThis as unknown as {
  inboundQueue?: Queue<InboundJobData>;
};

export function getInboundQueue(): Queue<InboundJobData> {
  if (!globalForQueue.inboundQueue) {
    globalForQueue.inboundQueue = new Queue<InboundJobData>(
      INBOUND_QUEUE_NAME,
      {
        connection: getRedisConnection(),
        defaultJobOptions: inboundJobOptions,
      }
    );
  }
  return globalForQueue.inboundQueue;
}

/**
 * Hand an inbound Twilio message off to the worker.
 *
 * Uses the Twilio MessageSid as the job id so that Twilio's own webhook
 * retries collapse into a single job instead of generating duplicate replies.
 *
 * @throws if the queue is disabled or Redis is unreachable — callers should
 *         catch and fall back to inline processing.
 */
export async function enqueueInboundMessage(
  message: InboundJobData
): Promise<void> {
  if (!isQueueEnabled) {
    throw new Error("Queue is disabled (REDIS_URL not set)");
  }

  await getInboundQueue().add("inbound", message, {
    jobId: message.messageSid || undefined,
  });
}
