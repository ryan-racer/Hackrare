# WhatsApp Bot Setup Guide

This guide walks you through setting up the WhatsApp bot so patients receive symptom check-ins and can reply via WhatsApp. The app uses **Twilio** for WhatsApp.

---

## 1. Create or use a Twilio account

1. Go to [twilio.com](https://www.twilio.com) and sign up (or log in).
2. From the [Twilio Console](https://console.twilio.com), note:
   - **Account SID** (Dashboard)
   - **Auth Token** (Dashboard — click “Show”)

You’ll need these for environment variables.

---

## 2. Enable WhatsApp in Twilio

### Option A: WhatsApp Sandbox (easiest for testing)

1. In Twilio Console, open **Messaging** → **Try it out** → **Send a WhatsApp message**.
2. Or go to **Messaging** → **Settings** → **WhatsApp senders** and open the **Sandbox**.
3. Follow the steps to connect your WhatsApp number to the sandbox (you’ll send a code to a Twilio number).
4. After connecting, you’ll see the sandbox number, e.g. `+1 415 523 8886`.
5. Your **TWILIO_WHATSAPP_FROM** value is: `whatsapp:+14155238886` (no spaces).

### Option B: WhatsApp Business API (for production)

1. In Twilio: **Messaging** → **WhatsApp senders** → **Request access** (or use an existing WhatsApp Business Account).
2. Complete Meta’s approval and get a WhatsApp-enabled number.
3. Use that number as **TWILIO_WHATSAPP_FROM**, e.g. `whatsapp:+1234567890`.

---

## 3. Set environment variables

Set these where your app runs (e.g. Render Dashboard → Environment):

| Variable | Example | Description |
|----------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | From Twilio Console → Dashboard |
| `TWILIO_AUTH_TOKEN` | `your_auth_token` | From Twilio Console → Dashboard |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Your Twilio WhatsApp number (Sandbox or Business), with `whatsapp:` prefix |

**Local development:** Copy these into `.env` (see `.env.example`). Do not commit real values to git.

---

## 4. Configure the webhook in Twilio

Twilio must know where to send incoming WhatsApp messages.

1. In Twilio Console go to **Messaging** → **Settings** → **WhatsApp senders**.
2. Open your Sandbox (or your WhatsApp sender).
3. Under **When a message comes in**:
   - Set the URL to your app’s WhatsApp webhook:
     - **Production (Render):** `https://<your-render-service>.onrender.com/api/whatsapp/incoming`
     - **Local (with ngrok):** `https://<your-ngrok-subdomain>.ngrok.io/api/whatsapp/incoming`
   - Method: **POST** (default).
4. Save.

Twilio will send every incoming WhatsApp message to this URL; your app replies with TwiML and Twilio delivers the reply to the patient.

---

## 5. Deploy and test

### If you use Render

1. Add the three Twilio env vars in the Render service **Environment** tab.
2. Deploy (or let auto-deploy run).
3. Use the live URL in the webhook (step 4): `https://<your-service>.onrender.com/api/whatsapp/incoming`.

### Local testing with ngrok

1. Run your app: `npm run dev`.
2. In another terminal: `ngrok http 3000`.
3. Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`).
4. In Twilio, set “When a message comes in” to: `https://abc123.ngrok.io/api/whatsapp/incoming`.
5. Send a WhatsApp message to your Twilio Sandbox number from a phone that has completed onboarding with that number.

---

## 6. End-to-end flow check

1. **Phone in app:** Patient signs up and completes onboarding with a phone number in E.164 (e.g. `+15551234567`). Phone is required.
2. **Welcome message:** Right after onboarding, the patient should receive a WhatsApp message: *“Hi! You're signed up for symptom tracking…”*
3. **Check-ins:** When the cron runs (e.g. daily), the app creates a check-in and sends the first question via WhatsApp (e.g. *“Did you have a headache since we last spoke?”*).
4. **Replies:** Patient replies on WhatsApp. The webhook receives the message, processes it (check-in or general chat), and returns the next question or AI reply; Twilio sends that back to the patient.
5. **Portal:** The same conversation is stored in the backend, so the patient portal and WhatsApp stay in sync.

---

## 7. Troubleshooting

| Issue | What to check |
|-------|----------------|
| No welcome message after signup | Env vars set? Phone in E.164? Check Render logs for “WhatsApp welcome message failed”. |
| Incoming messages not answered | Webhook URL correct and HTTPS? Middleware allows `/api/whatsapp/incoming` without auth. Check Render logs for errors. |
| “Account not found” reply | Patient’s `User.phone` in DB must match the sender. Twilio sends `whatsapp:+15551234567`; we normalize to `+15551234567`. Ensure onboarding saved the same format. |
| 403 on webhook | If you set `TWILIO_AUTH_TOKEN`, Twilio signature validation runs. Ensure the webhook URL in Twilio exactly matches the URL your app receives (including any redirects). |
| Cron not sending WhatsApp | Cron must be triggered (e.g. Render cron job or external scheduler). Patient must have `phone` set. Check cron logs for “WhatsApp send failed”. |

---

## 8. Security note

- Keep **Auth Token** and **TWILIO_WHATSAPP_FROM** secret.
- With `TWILIO_AUTH_TOKEN` set, the app validates the Twilio request signature and rejects forged requests.
- The webhook route is excluded from Auth0 so Twilio can POST without a user session.
