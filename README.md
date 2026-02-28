# Symptom Journal

A full-stack app for patients to track symptoms via an LLM chatbot; doctors see medical-speak summaries, trends, and AI analysis.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` (SQLite: `file:./dev.db`)
   - `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - `OPENAI_API_KEY` (for summaries and trend analysis)
   - Optional: `CRON_SECRET` for protecting the cron endpoint

2. Install and DB:

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

3. Run:

```bash
npm run dev
```

## Seed accounts

- **Patient:** patient@test.com / password123  
- **Doctor:** doctor@test.com / password123  

The seed links the patient to the doctor and assigns the Migraine journal template.

## Features

- **Patient:** Start check-ins (manual or via cron), answer symptom questions in chat, view/edit raw data, see generated summary.
- **Doctor:** View patients and their check-ins with medical summaries, trends (e.g. headache count by week), and AI trend analysis (generate from recent summaries).
- **Cron:** Call `GET /api/cron/run-check-ins` daily (e.g. 9am) with `Authorization: Bearer <CRON_SECRET>` to create new check-ins for assigned journals.
