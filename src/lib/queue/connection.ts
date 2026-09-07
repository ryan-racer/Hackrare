import IORedis from "ioredis";

/**
 * Shared Redis connection for BullMQ.
 *
 * When REDIS_URL is unset the queue is disabled and callers fall back to
 * processing inline — this keeps local dev and demos working without Redis.
 */
export const isQueueEnabled = Boolean(process.env.REDIS_URL);

const globalForRedis = globalThis as unknown as { redis?: IORedis };

export function getRedisConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set — cannot create a Redis connection");
  }

  if (!globalForRedis.redis) {
    globalForRedis.redis = new IORedis(url, {
      // BullMQ issues blocking commands (BRPOPLPUSH) and requires retries to be
      // unbounded; ioredis throws "max retries per request" otherwise.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    globalForRedis.redis.on("error", (err: Error) => {
      console.error("[redis] connection error:", err.message);
    });
  }

  return globalForRedis.redis;
}
