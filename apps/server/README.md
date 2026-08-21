# server

Express API on port **4000**. Auth uses Prisma + an httpOnly JWT cookie.

```bash
cp .env.example .env
bun install
bunx prisma migrate dev
bun run dev
```

| Method | Path | Body |
|--------|------|------|
| POST | `/signup` | `{ name, email, password }` |
| POST | `/signin` | `{ email, password }` |
| POST | `/signout` | — |
| GET | `/me` | — |
| POST | `/project` | `{ initialPrompt }` (auth, not implemented) |
| GET | `/projects` | — (auth, not implemented) |
| GET | `/project/:id` | — (auth, not implemented) |
| POST | `/project/conversation/:projectId` | `{ contents }` (auth, not implemented) |
