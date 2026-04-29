# Robot-Human-Turing

Minimal internal research app for a video-based Turing test.

## Stack

- Frontend + Backend: Next.js (App Router + Route Handlers)
- Database: PostgreSQL (Supabase-compatible schema)
- Video hosting: Cloudinary delivery URLs

## Project Layout

- `app/` Next.js app router pages + API routes
- `lib/` shared backend/typing utilities
- `sql/schema.sql` database schema

## Quick Start

### 1) Frontend (includes backend API)

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

App and API run at `http://localhost:3000`.

## Environment Variables

### App (`.env.local`)

- `DATABASE_URL` PostgreSQL connection string
- `CLOUDINARY_URL` Cloudinary connection URL for video uploads

## Notes

- This is intentionally lightweight for internal iteration.
- Ground-truth labels are not returned to the client.
- Upload page is available at `/upload` for adding tagged videos.

## Vercel Deployment

1. Import this repository into Vercel.
2. Add env var `DATABASE_URL` (Supabase Postgres string).
3. Apply `sql/schema.sql` to your database.
4. Deploy.
