# Deploying to Render.com

This app is set up for deployment on [Render](https://render.com) with a **PostgreSQL** database. (Render’s disk is ephemeral, so SQLite is not suitable for production.)

## Quick deploy (Blueprint)

1. Push this repo to GitHub (or GitLab).
2. In [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo; Render will read `render.yaml` and create:
   - A **PostgreSQL** database (`hackrare-db`)
   - A **Web Service** (`hackrare`) linked to it.
4. In the **Web Service** → **Environment**:
   - Set **NEXTAUTH_URL** to your app URL, e.g. `https://hackrare.onrender.com` (replace with your actual service URL).
   - Optionally add **OPENAI_API_KEY** and **CRON_SECRET** if you use AI or cron.
5. Deploy. The first deploy will run migrations via `preDeployCommand`.

## Manual setup (no Blueprint)

1. **New** → **PostgreSQL**; note the **Internal Database URL**.
2. **New** → **Web Service**; connect the repo.
3. Use:
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Pre-Deploy Command (optional but recommended):** `npx prisma migrate deploy`
4. **Environment**:
   - **DATABASE_URL** = Internal Database URL from step 1.
   - **NEXTAUTH_URL** = `https://<your-service-name>.onrender.com`
   - **NEXTAUTH_SECRET** = a long random string (e.g. `openssl rand -base64 32`).
   - **OPENAI_API_KEY** / **CRON_SECRET** if needed.

## Environment variables

| Variable           | Required | Description |
|--------------------|----------|-------------|
| `DATABASE_URL`     | Yes      | PostgreSQL URL (set automatically if using Blueprint + linked DB). |
| `NEXTAUTH_URL`     | Yes      | Full app URL, e.g. `https://hackrare.onrender.com`. |
| `NEXTAUTH_SECRET`  | Yes      | Secret for signing sessions (Blueprint can generate). |
| `OPENAI_API_KEY`   | No       | For AI features. |
| `CRON_SECRET`      | No       | For securing cron/check-in endpoints. |

## Local development with PostgreSQL

The app uses **PostgreSQL** in production. For local dev you can:

- Use [Docker]: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`, then  
  `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"`.
- Or a free [Neon](https://neon.tech) or [Supabase](https://supabase.com) Postgres and put its URL in `.env`.

Copy `.env.example` to `.env` and set these. Then:

```bash
npm install
npx prisma migrate dev   # apply migrations
npm run db:seed          # optional: seed test users
npm run dev
```

[Docker]: https://www.docker.com/
