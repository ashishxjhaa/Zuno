# Zuno

Chat-only AI website builder. Describe a site, get a live Vite + React + TypeScript + Tailwind preview, then iterate in chat. Files and the preview run in an **E2B** sandbox. Postgres stores users, project metadata, and chat. There is no S3.

## Local run

1. Postgres running, then:

```bash
bun install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

2. Fill `apps/server/.env`: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (`http://localhost:3000`), `E2B_API_KEY`, `DEEPSEEK_API_KEY`. Keep `PORT=4000` so it matches `apps/web/.env` (`NEXT_PUBLIC_API_URL=http://localhost:4000`).

3. Migrate and start both apps:

```bash
cd apps/server && bunx prisma migrate dev && bun run dev
```

```bash
cd apps/web && bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, sign in, then Build. You go to `/builder/{id}` immediately; the cooking overlay stays until the sandbox and DeepSeek finish.

## Flow

- **Build:** `POST /api/v1/project` inserts the project and returns `{ id }`. E2B + DeepSeek run in the background.
- **Builder:** polls `GET /api/v1/project/:id`, iframe is the E2B Vite URL, code tab is read-only, chat is `POST .../conversation`.
- **Unpublished:** heartbeat while the tab is open. After 30 minutes idle, the sandbox is killed and the project is deleted.
- **Publish:** `POST .../publish` returns `{ url }` (live E2B preview). Published projects are not idle-deleted.
