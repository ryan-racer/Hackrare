import twilio from "twilio";

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Send an SMS via Twilio.
 * @param to - E.164 phone number (e.g. +15551234567)
 * @param body - Message text
 */
export async function sendSmsMessage(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_TEXT_FROM;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!from || !accountSid || !authToken) {
    console.warn("SMS send skipped: TWILIO_TEXT_FROM, TWILIO_ACCOUNT_SID, or TWILIO_AUTH_TOKEN not set");
    return;
  }

  const trimmed = to.trim();
  if (!E164_REGEX.test(trimmed)) {
    console.warn(`SMS send skipped: invalid E.164 phone ${to}`);
    return;
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    from,
    to: trimmed,
    body,
  });
}
