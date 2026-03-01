# Symptom Journal (Hackrare)

Full-stack app for patients to track symptoms via an LLM-assisted chatbot. Doctors see medical summaries, trends, and AI analysis.

## Tech stack

- **Next.js 15** (App Router), **React 19**, **Tailwind CSS**
- **Auth0** (primary login), **PostgreSQL**, **Prisma**
- **OpenAI** (summaries, trend analysis, general chat), **TanStack Query**, **Recharts**

## Local setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - **Database:** `DATABASE_URL` (e.g. local Postgres or `postgresql://user:pass@localhost:5432/hackrare`)
   - **Auth0:** From [Auth0 Dashboard](https://manage.auth0.com/) → Application → Settings:
     - `AUTH0_DOMAIN` (e.g. `your-tenant.us.auth0.com`)
     - `AUTH0_CLIENT_ID`
     - `AUTH0_CLIENT_SECRET`
     - `AUTH0_SECRET` (64 chars, e.g. `openssl rand -hex 32`)
     - `APP_BASE_URL` (e.g. `http://localhost:3000`)
   - **Auth0 app settings:** Allowed Callback URLs = `http://localhost:3000/auth/callback`, Allowed Logout URLs = `http://localhost:3000`
   - **Optional:** `OPENAI_API_KEY`, `CRON_SECRET` (for cron endpoint)

3. **Database**

   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. **Run**

   ```bash
   npm run dev
   ```

## Seed accounts (credentials login)

If you use the optional NextAuth credentials flow (e.g. `/api/auth/register`):

- **Patient:** patient@test.com / password123  
- **Doctor:** doctor@test.com / password123  

The seed links the patient to the doctor and assigns the Migraine journal template. Auth0 users are created in the DB on first login.

## Deploy on Render

1. **One-click (Blueprint)**  
   Connect the repo and use the **Render Blueprint** (`render.yaml`). Render will create the web service and Postgres database and wire `DATABASE_URL`.

2. **Environment variables**  
   In the Render service **Environment** tab, set (or let Render generate):

   - `AUTH0_SECRET` (or use “Generate”)
   - `APP_BASE_URL` = your Render URL (e.g. `https://hackrare.onrender.com`)
   - `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` from your Auth0 application

   In Auth0, set **Allowed Callback URLs** and **Allowed Logout URLs** to your Render URL (e.g. `https://hackrare.onrender.com/auth/callback`, `https://hackrare.onrender.com`).

3. **Optional:** `OPENAI_API_KEY`, `CRON_SECRET` (generate a secret for the cron endpoint).

## Features

- **Patient:** Start check-ins (manual or via cron), answer symptom questions in chat, view/edit raw data, see generated summary.
- **Doctor:** View patients and their check-ins with medical summaries, trends (e.g. headache count by week), and AI trend analysis.
- **Cron:** Call `GET /api/cron/run-check-ins` daily (e.g. 9am) with `Authorization: Bearer <CRON_SECRET>` to create new check-ins for assigned journals.

## Project structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for directory layout and main flows.
