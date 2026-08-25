# server

Express API on port **4000** (override with `PORT`). JWT cookie auth. Project files live in E2B, not S3.

```bash
cp .env.example .env
bun install
bunx prisma migrate dev
bun run dev
```

Auth is under `/api/v1/auth`. Projects are under `/api/v1/project`.

| Method | Path | Body |
|--------|------|------|
| POST | `/api/v1/auth/signup` | `{ name, email, password }` |
| POST | `/api/v1/auth/signin` | `{ email, password }` |
| POST | `/api/v1/auth/signout` | (none) |
| GET | `/api/v1/auth/me` | (none) |
| POST | `/api/v1/project` | `{ initialPrompt }` |
| GET | `/api/v1/project/:id` | (none) |
| POST | `/api/v1/project/:id/conversation` | `{ contents }` |
| POST | `/api/v1/project/:id/heartbeat` | (none) |
| POST | `/api/v1/project/:id/publish` | (none) |
