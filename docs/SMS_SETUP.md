# SMS Bot Setup Guide

This guide walks you through setting up the SMS bot so patients receive symptom check-ins and can reply via text. The app uses **Twilio** for SMS.

---

## 1. Create or use a Twilio account

1. Go to [twilio.com](https://www.twilio.com) and sign up (or log in).
2. From the [Twilio Console](https://console.twilio.com), note:
   - **Account SID** (Dashboard)
   - **Auth Token** (Dashboard — click “Show”)

You’ll need these for environment variables.

---

## 2. Get a Twilio phone number

1. In Twilio Console go to **Phone Numbers** → **Manage** → **Buy a number**.
2. Choose a number with **SMS** capability (and optionally Voice if needed).
3. Note the number in E.164 format, e.g. `+15551234567` — this is your **TWILIO_TEXT_FROM**.

---

## 3. Set environment variables

Add these to your `.env` (or Render Dashboard → Environment):

| Variable | Example | Description |
|----------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | From Twilio Console → Dashboard |
| `TWILIO_AUTH_TOKEN` | `your_auth_token` | From Twilio Console → Dashboard |
| `TWILIO_TEXT_FROM` | `+15551234567` | Your Twilio phone number (E.164, no spaces) |

---

## 4. Configure the webhook in Twilio

Twilio must know where to send incoming SMS messages.

1. In Twilio Console go to **Phone Numbers** → **Manage** → **Active numbers**.
2. Click your number.
3. Under **Messaging** → **A MESSAGE COMES IN**:
   - Set the URL to your app’s SMS webhook:
     - **Production (Render):** `https://<your-render-service>.onrender.com/api/sms/incoming`
     - **Local (with ngrok):** `https://<your-ngrok-subdomain>.ngrok.io/api/sms/incoming`
   - Method: **POST** (default).
4. Save.

Twilio will send every incoming SMS to this URL; your app replies with TwiML and Twilio delivers the reply to the patient.

---

## 5. Deploy and test

### If you use Render

1. Add the three Twilio env vars in the Render service **Environment** tab.
2. Deploy (or let auto-deploy run).
3. Use the live URL in the webhook (step 4): `https://<your-service>.onrender.com/api/sms/incoming`.

### Local testing with ngrok

1. Run your app: `npm run dev`.
2. In another terminal: `ngrok http 3000`.
3. Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`).
4. In Twilio, set “A MESSAGE COMES IN” to: `https://abc123.ngrok.io/api/sms/incoming`.
5. Send an SMS to your Twilio number from a phone that has completed onboarding with that number.

---

## 6. End-to-end flow check

1. **Phone in app:** Patient signs up and completes onboarding with a phone number in E.164 (e.g. `+15551234567`). Phone is required.
2. **Welcome message:** Right after onboarding, the patient should receive an SMS: *“Hi! You're signed up for symptom tracking…”*
3. **Check-ins:** When the cron runs (e.g. daily), the app creates a check-in and sends the first question via SMS (e.g. *“Did you have a headache since we last spoke?”*).
4. **Replies:** Patient replies by text. The webhook receives the message, processes it (check-in or general chat), and returns the next question or AI reply; Twilio sends that back to the patient.
5. **Portal:** The same conversation is stored in the backend, so the patient portal and SMS stay in sync.

---

## 7. Troubleshooting

| Issue | What to check |
|-------|----------------|
| No welcome message after signup | Env vars set? Phone in E.164? Check Render logs for “SMS welcome message failed”. |
| Incoming messages not answered | Webhook URL correct and HTTPS? Middleware allows `/api/sms/incoming` without auth. Check Render logs for errors. |
| “Account not found” reply | Patient’s `User.phone` in DB must match the sender. Twilio sends `+15551234567`; ensure onboarding saved the same format. |
| Cron not sending SMS | Cron must be triggered (e.g. Render cron job or external scheduler). Patient must have `phone` set. Check cron logs for “SMS send failed”. |

---

## 8. Security note

- Keep **Auth Token** and **TWILIO_TEXT_FROM** secret.
- The webhook route is excluded from Auth0 so Twilio can POST without a user session.
