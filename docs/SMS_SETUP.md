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

Twilio sends every incoming SMS to this URL. The webhook acknowledges immediately and hands the message to a background queue; the worker generates the reply and sends it back as a separate outbound message. See [§9 Queue and worker](#9-queue-and-worker) for why.

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
4. **Replies:** Patient replies by text. The webhook receives the message, enqueues it, and acks Twilio right away. The worker processes it (check-in or general chat) and sends the next question or AI reply as a new outbound SMS — usually within a couple of seconds.
5. **Portal:** The same conversation is stored in the backend, so the patient portal and SMS stay in sync.

---

## 7. Troubleshooting

| Issue | What to check |
|-------|----------------|
| No welcome message after signup | Env vars set? Phone in E.164? Check Render logs for “SMS welcome message failed”. |
| Incoming messages not answered | Is the **worker** service running? Check its logs. Webhook URL correct and HTTPS? Middleware allows `/api/sms/incoming` without auth. |
| Messages queue but never get a reply | Worker down, or `TWILIO_TEXT_FROM` missing on the **worker** service — it logs a warning at startup and fails the job loudly. |
| Twilio error 11200 / timeout | Should no longer happen. If it does, `REDIS_URL` is probably unset on the web service, so it fell back to processing inline. |
| Duplicate replies | Shouldn't happen — jobs are keyed by Twilio `MessageSid`, so webhook retries collapse into one job. |
| “Account not found” reply | Patient’s `User.phone` in DB must match the sender. Twilio sends `+15551234567`; ensure onboarding saved the same format. |
| Cron not sending SMS | Cron must be triggered (e.g. Render cron job or external scheduler). Patient must have `phone` set. Check cron logs for “SMS send failed”. |

---

## 8. Security note

- Keep **Auth Token** and **TWILIO_TEXT_FROM** secret.
- The webhook route is excluded from Auth0 so Twilio can POST without a user session.
- Requests are verified against `TWILIO_AUTH_TOKEN` using Twilio's request signature, so the web service needs that variable set even though it no longer sends messages itself.

---

## 9. Queue and worker

### Why

Twilio gives a webhook about **15 seconds** before it gives up with error 11200. Generating a reply means calling OpenAI, which regularly takes longer than that under load. When it did, Twilio timed out, the patient got nothing, and the request could be killed mid-write.

So the webhook no longer does the slow work:

```
Twilio ──POST──► /api/sms/incoming ──enqueue──► Redis (BullMQ)
                        │                          │
                   empty TwiML                     ▼
                   (<100ms ack)               worker process
                                                   │
                                             OpenAI + Postgres
                                                   │
                                    Twilio REST API ──► patient
```

The reply arrives as a **separate outbound message** rather than in the webhook response. That's the trade-off that makes the timeout unreachable.

### Running it

The worker is a second long-lived process — it is not part of the Next.js app:

```bash
# terminal 1
redis-server

# terminal 2
npm run dev

# terminal 3
npm run worker
```

Set `REDIS_URL` in `.env` (e.g. `redis://localhost:6379`). On Render, `render.yaml` provisions a Key Value instance and a `hackrare-worker` service wired to it.

**If `REDIS_URL` is unset**, the webhook falls back to generating the reply inline and returning TwiML — the old behavior. Convenient for local work, but it reintroduces the timeout risk, so don't run production that way.

### Behavior

| Property | How |
|---|---|
| Duplicate suppression | Job id is the Twilio `MessageSid`, so Twilio's own webhook retries don't create a second job. |
| Retries | 5 attempts, exponential backoff from 2s — covers OpenAI 429s and 5xx. |
| No double-writes | The OpenAI call happens before any DB write, so a failed attempt leaves no partial state. Once a reply is generated it's stored on the job, so a delivery failure retries only the send. |
| Failure retention | Failed jobs are kept 7 days, so a message is never silently lost — it can be inspected and replayed. |
| Concurrency | `WORKER_CONCURRENCY`, default 5. |

To push a synthetic message through the queue:

```bash
REDIS_URL=redis://localhost:6379 npx tsx src/worker/enqueue-test.ts
```
