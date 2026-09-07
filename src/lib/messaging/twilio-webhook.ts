import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import {
  handleInboundMessage,
  normalizePhone,
  type Channel,
  type InboundMessage,
} from "@/lib/messaging/handle-inbound";
import { enqueueInboundMessage } from "@/lib/queue/inbound-queue";
import { isQueueEnabled } from "@/lib/queue/connection";

const MessagingResponse = twilio.twiml.MessagingResponse;

function twimlResponse(message?: string): NextResponse {
  const twiml = new MessagingResponse();
  if (message) twiml.message(message);
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Rebuild the externally-visible URL Twilio signed.
 *
 * Behind Render's proxy `req.url` reports the internal http:// origin, which
 * produces a different signature than the https:// URL configured in the
 * Twilio console.
 */
function publicUrl(req: NextRequest): string {
  const host = (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim();
  if (!host) return req.url;

  const proto = (req.headers.get("x-forwarded-proto") ?? "https")
    .split(",")[0]
    .trim();

  const url = new URL(req.url);
  url.protocol = `${proto}:`;
  url.host = host;
  return url.toString();
}

function isValidSignature(
  req: NextRequest,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // No token configured (local dev) — nothing to validate against.
  if (!authToken) return true;

  const signature = req.headers.get("x-twilio-signature") ?? "";
  // Accept either the proxy-corrected URL or the raw one, since which is
  // correct depends on how the app is fronted.
  const candidates = [publicUrl(req), req.url];
  const ok = candidates.some((url) =>
    twilio.validateRequest(authToken, signature, url, params)
  );

  if (!ok) {
    // Signature mismatches are almost always a URL mismatch rather than an
    // attack — log the candidates (never the signature) so it's debuggable.
    console.warn(
      `[twilio] signature rejected; tried ${candidates.map((u) => `"${u}"`).join(" and ")}. ` +
        `It must exactly match the webhook URL configured in the Twilio console.`
    );
  }

  return ok;
}

/**
 * Shared entrypoint for the Twilio SMS and WhatsApp webhooks.
 *
 * Twilio gives a webhook ~15s before it gives up (error 11200) and the
 * patient's message is lost. Generating a reply means calling OpenAI, which
 * regularly exceeds that. So this handler does the cheap work only — validate,
 * enqueue, ack — and returns empty TwiML in well under a second. The worker
 * calls OpenAI on its own time and delivers the reply via the Twilio REST API.
 */
export async function handleTwilioWebhook(
  req: NextRequest,
  channel: Channel
): Promise<NextResponse> {
  const body = await req.formData();

  const params: Record<string, string> = {};
  body.forEach((value, key) => {
    params[key] = String(value);
  });

  if (!isValidSignature(req, params)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const from = normalizePhone((body.get("From") as string) ?? "");
  if (!from) {
    return twimlResponse("Invalid sender. Please try again.");
  }

  const content = (body.get("Body") as string)?.trim() ?? "";
  if (!content) {
    return twimlResponse("Please send a message.");
  }

  const message: InboundMessage = {
    channel,
    from,
    body: content,
    messageSid: (body.get("MessageSid") as string) ?? undefined,
  };

  if (isQueueEnabled) {
    try {
      await enqueueInboundMessage(message);
      // Ack now; the worker replies out-of-band via the REST API.
      return twimlResponse();
    } catch (err) {
      console.error(
        `[twilio:${channel}] enqueue failed for ${message.messageSid ?? "unknown sid"}, falling back to inline:`,
        err
      );
    }
  }

  // Fallback: no Redis configured, or the enqueue failed. Process inline and
  // reply via TwiML. This is the path that can hit Twilio's timeout, so it is
  // a last resort rather than the normal route.
  try {
    const reply = await handleInboundMessage(message);
    return twimlResponse(reply);
  } catch (err) {
    console.error(`[twilio:${channel}] inline processing failed:`, err);
    return twimlResponse(
      "Sorry, something went wrong on our end. Please try again in a moment."
    );
  }
}
