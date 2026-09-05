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

## Fast preview (10-12s SLA)

First preview after stack confirm must appear in about 10-12 seconds. That requires a prebaked E2B template:

1. Build an E2B template from `templates/vite-react-ts` (and the other stacks) with `bun install` already done under `/home/user/project`.
2. Set `E2B_TEMPLATE_REACT_TS` / `E2B_TEMPLATE_REACT_JS` / `E2B_TEMPLATE_NEXT_TS` / `E2B_TEMPLATE_NEXT_JS` to those template aliases.
3. On build start the server creates from the alias, starts `bun run dev` immediately, then runs LLM file edits over HMR.

If the env vars are missing, the cold path copies files and runs `bun install` (logs a CRITICAL warning). That path cannot hit the SLA.

## E2B prebaked templates

First preview SLA is **10-12s**. That requires prebaked templates (bun + deps under `/home/user/project`), not cold `bun install`.

```bash
cd apps/server
set -a && source .env && set +a
./scripts/build-e2b-templates.sh                # all stacks
./scripts/build-e2b-templates.sh vite-react-ts  # one stack
```

Then set in `.env`:

```
E2B_TEMPLATE_VITE_REACT_TS=zuno-vite-react-ts
E2B_TEMPLATE_VITE_REACT_JS=zuno-vite-react-js
E2B_TEMPLATE_NEXT_TS=zuno-next-ts
E2B_TEMPLATE_NEXT_JS=zuno-next-js
```

Without aliases the server throws unless `E2B_ALLOW_SLOW_FALLBACK=1` (minutes, misses SLA).
