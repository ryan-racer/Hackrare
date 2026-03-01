import twilio from "twilio";

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Send a WhatsApp message via Twilio.
 * @param to - E.164 phone number (e.g. +15551234567)
 * @param body - Message text
 * @throws if Twilio credentials are missing or send fails
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!from || !accountSid || !authToken) {
    console.warn("WhatsApp send skipped: TWILIO_WHATSAPP_FROM, TWILIO_ACCOUNT_SID, or TWILIO_AUTH_TOKEN not set");
    return;
  }

  const trimmed = to.trim();
  if (!E164_REGEX.test(trimmed)) {
    console.warn(`WhatsApp send skipped: invalid E.164 phone ${to}`);
    return;
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    from,
    to: `whatsapp:${trimmed}`,
    body,
  });
}
