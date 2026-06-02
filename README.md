# SyncBrief

SyncBrief is an MVP full-stack monorepo for a React frontend, Express API, Supabase Postgres, and OpenAI-powered features.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Express + TypeScript
- Database: Supabase Postgres
- AI: OpenAI API

## Structure

```txt
frontend/
backend/
README.md
.gitignore
```

## Setup

Install dependencies from the repo root:

```bash
npm install
```

Copy environment files and fill in your keys:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Run the apps separately:

```bash
npm run dev:frontend
npm run dev:backend
```

Frontend runs on `http://localhost:5173`.
Backend runs on `http://localhost:3001`.

## Scripts

- `npm run dev:frontend` starts the Vite dev server.
- `npm run dev:backend` starts the Express API with hot reload.
- `npm run build:frontend` builds the frontend.
- `npm run build:backend` compiles the backend TypeScript.
