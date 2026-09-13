# Order Hub Link

## Overview

This project is a full‑stack web application that demonstrates a **React + Vite** client and an **Express** server using **Drizzle ORM** with a **PostgreSQL** database hosted on **Supabase**.

- **Client** (`client/`): React components written in TypeScript, built with Vite, and styled with vanilla CSS.
- **Server** (`server/`): Express server that serves the Vite‑built client and provides REST API endpoints defined in `@shared/routes`. It uses `pg` and `drizzle‑orm` to talk to the Supabase database.
- **Database**: Supabase PostgreSQL instance. Connection details are stored in a `.env` file (`DATABASE_URL`). For local development we disable TLS verification (`rejectUnauthorized: false`) to work around self‑signed certs.
- **Seeding**: On start the server attempts to seed a menu of Nepali dishes. The seeding process is wrapped in a `try/catch` so the app still runs even if the DB is unreachable.
- **Environment**: The server reads environment variables via `dotenv`. The `.env` file is listed in `.gitignore` and never committed.

## Development

```bash
# install dependencies
npm install

# start both client and server (development mode)
npm run dev
```

The app will be available at **http://localhost:3000** (or the port defined in `PORT`).

## Deployment

- **Client** can be deployed to any static‑site host (Netlify, Vercel, GitHub Pages). The `vite.config.ts` builds the client into the `dist/` folder.
- **Server** can be deployed to a Node.js environment (e.g., Render, Fly.io, Railway). Ensure the environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `DATABASE_URL` are set in the target environment.
- **Supabase** provides the PostgreSQL database and authentication via the anon key.

## Scripts

- `npm run dev` – Starts the Express server and Vite dev server together.
- `npm run build` – Builds the client for production.
- `npm start` – Runs the compiled server (`node dist/server/index.js`).

## Notes

- The `.env` file is never committed. It contains sensitive credentials.
- TLS verification is disabled only for local development (`process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"`). Do not use this in production.
- Seeding is optional; failures are logged and ignored so the UI can still function with mock data.
