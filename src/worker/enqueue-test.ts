import "dotenv/config";
import { enqueueInboundMessage } from "@/lib/queue/inbound-queue";
import { getRedisConnection } from "@/lib/queue/connection";

/**
 * Manual smoke test: push a synthetic inbound message onto the queue.
 *
 *   REDIS_URL=redis://localhost:6379 npx tsx src/worker/enqueue-test.ts [sid] [preset-reply]
 *
 * Passing a preset reply simulates a job whose reply was already generated on
 * an earlier attempt, so the worker should skip straight to delivery.
 */
async function main() {
  const sid = process.argv[2] ?? `SMtest${Date.now()}`;
  const presetReply = process.argv[3];

  await enqueueInboundMessage({
    channel: "sms",
    from: "+15550009999",
    body: "my head has been throbbing since this morning",
    messageSid: sid,
    ...(presetReply ? { generatedReply: presetReply } : {}),
  });
  console.log(`enqueued ${sid}${presetReply ? " (with preset reply)" : ""}`);
  await getRedisConnection().quit();
}

void main();
