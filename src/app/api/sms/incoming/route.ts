import { NextRequest, NextResponse } from "next/server";
import { handleTwilioWebhook } from "@/lib/messaging/twilio-webhook";

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleTwilioWebhook(req, "sms");
}
