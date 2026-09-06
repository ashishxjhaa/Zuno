<p align="center">
  <img src="apps/web/public/zuno.svg" alt="Zuno" width="72" />
</p>

<p align="center">
  <img src="docs/images/00-hero-banner.png" alt="Zuno - prompt to a live website" width="100%" />
</p>

<h1 align="center">Zuno</h1>

<p align="center">
  <strong>Prompt. Preview. Ship.</strong><br />
  You do not need a developer team to bring an idea to life. Full-stack AI website builder with live E2B preview, iterate, push to GitHub, and publish with a live link.
</p>

<p align="center">
  <a href="https://zuno.ashishjha.xyz">
    <img src="https://shieldcn.dev/badge/Live-Demo-FF5800.svg?logo=lu:Rocket&variant=default&size=sm" alt="Live Demo" />
  </a>
  &nbsp;
  <a href="https://github.com/ashishxjhaa/Zuno">
    <img src="https://shieldcn.dev/github/stars/ashishxjhaa/Zuno.svg?variant=outline&size=sm" alt="GitHub Stars" />
  </a>
  &nbsp;
  <a href="https://github.com/ashishxjhaa/Zuno">
    <img src="https://shieldcn.dev/github/forks/ashishxjhaa/Zuno.svg?variant=outline&size=sm" alt="GitHub Forks" />
  </a>
  &nbsp;
  <a href="https://github.com/ashishxjhaa/Zuno/issues">
    <img src="https://shieldcn.dev/github/issues/ashishxjhaa/Zuno.svg?variant=outline&size=sm" alt="Issues" />
  </a>
</p>

<p align="center">
  <img src="https://shieldcn.dev/badge/Next.js-16-black.svg?logo=nextdotjs&variant=branded&size=sm" alt="Next.js" />
  <img src="https://shieldcn.dev/badge/Bun-runtime-fbf0df.svg?logo=bun&variant=branded&size=sm" alt="Bun" />
  <img src="https://shieldcn.dev/badge/Express-5-000000.svg?logo=express&variant=branded&size=sm" alt="Express" />
  <img src="https://shieldcn.dev/badge/Prisma-7-2D3748.svg?logo=prisma&variant=branded&size=sm" alt="Prisma" />
  <img src="https://shieldcn.dev/badge/PostgreSQL-Neon-4169E1.svg?logo=postgresql&variant=branded&size=sm" alt="PostgreSQL" />
  <img src="https://shieldcn.dev/badge/E2B-sandbox-FF5800.svg?logo=lu:Box&variant=default&size=sm" alt="E2B" />
  <img src="https://shieldcn.dev/badge/DeepSeek-AI-4D6BFE.svg?logo=lu:Sparkles&variant=default&size=sm" alt="DeepSeek" />
  <img src="https://shieldcn.dev/badge/AWS-EC2-FF9900.svg?logo=amazonec2&variant=branded&size=sm" alt="AWS EC2" />
  <img src="https://shieldcn.dev/badge/Nginx-proxy-009639.svg?logo=nginx&variant=branded&size=sm" alt="Nginx" />
  <img src="https://shieldcn.dev/badge/Turborepo-monorepo-EF4444.svg?logo=turborepo&variant=branded&size=sm" alt="Turborepo" />
</p>

<p align="center">
  <a href="https://zuno.ashishjha.xyz"><strong>Live Demo</strong></a>
  ·
  <a href="#features"><strong>Features</strong></a>
  ·
  <a href="#getting-started"><strong>Getting Started</strong></a>
  ·
  <a href="#architecture"><strong>Architecture</strong></a>
  ·
  <a href="#deployment"><strong>Deployment</strong></a>
  ·
  <a href="https://ashishjha.xyz/"><strong>Author</strong></a>
</p>

---

## Why Zuno?

Most AI builders dump a zip and leave you guessing. Zuno keeps you in a **conversational builder** with a **real live preview** in an E2B sandbox. You clarify, pick a stack, watch the site generate, then ship edits by talking - no drag-and-drop canvas required.

Built as a full-stack + AI portfolio product: auth, projects, sandboxes, publish, GitHub push, and codebase download.

---

## Features

| | |
| :--- | :--- |
| **Prompt to live site** | Clarify in chat, choose React or Next (JS or TS), and DeepSeek builds a complete Tailwind site. |
| **Live sandbox preview** | The builder iframe is a real E2B Vite/Next URL. Watch the site come together as files land. |
| **Conversational edits** | Change the site by talking. The model uses `readFile`, `writeFile`, `updateFile`, and `deleteFile`. |
| **Stack choice** | Vite + React or Next.js, JavaScript or TypeScript, with prebaked E2B templates for fast first paint. |
| **Push to GitHub** | Connect GitHub OAuth, create or link a repo, and push the generated source from the sandbox. |
| **Download codebase** | Export a source `.zip` (no `node_modules`) from the Download tab. |
| **Publish** | Keep a preview online. Unpublished projects go idle after 30 minutes and are cleaned up. |
| **Auth** | Email signup/signin with JWT httpOnly cookies and bcrypt-hashed passwords. |

---

## Screenshots

<p align="center">
  <img src="docs/images/01-landing-hero.png" alt="Zuno landing hero" width="100%" />
  <em>Landing - prompt box, stack pickers, and orange product UI</em>
</p>

<p align="center">
  <img src="docs/images/02-features.png" alt="Zuno features section" width="100%" />
  <em>Features - what Zuno ships out of the box</em>
</p>

<p align="center">
  <img src="docs/images/03-idea-to-life.png" alt="Idea to life section" width="100%" />
  <em>Idea to life - from a single prompt to a working site</em>
</p>

<table>
  <tr>
    <td width="50%" align="center">
      <img src="docs/images/04-signin.png" alt="Sign in" />
      <p><em>Sign in</em></p>
    </td>
    <td width="50%" align="center">
      <img src="docs/images/05-signup.png" alt="Sign up" />
      <p><em>Sign up</em></p>
    </td>
  </tr>
</table>

---

## Tech Stack

| Layer | Stack |
| :--- | :--- |
| **Web** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Motion |
| **API** | Bun + Express 5, Zod validation, JWT cookies |
| **Data** | Prisma 7, PostgreSQL (Neon or local `pg`) |
| **Sandboxes** | E2B (Vite React + Next templates, JS/TS) |
| **AI** | DeepSeek (site generation + chat tools) |
| **Export** | GitHub OAuth + Octokit push, JSZip download |
| **Hosting** | Single AWS EC2 instance, PM2, Nginx, Let's Encrypt |
| **Monorepo** | Turborepo + Bun workspaces |

---

## Architecture

```text
Zuno/
├── apps/
│   ├── web/       # Next.js frontend  → :3000  (EC2 + PM2)
│   └── server/    # Bun + Express API → :4000  (EC2 + PM2)
├── packages/
│   └── ui/        # Shared UI primitives
├── docs/images/   # README screenshots
└── package.json
```

Production is one AWS EC2 host. Nginx terminates HTTPS and routes public hostnames to the local processes.

| Service | Role | Production |
| :--- | :--- | :--- |
| `apps/web` | Landing, auth, builder (preview, code, chat, GitHub, download) | EC2 + PM2 on `:3000` → [zuno.ashishjha.xyz](https://zuno.ashishjha.xyz) |
| `apps/server` | REST API, Prisma, E2B, DeepSeek, GitHub OAuth, idle reaper | EC2 + PM2 on `:4000` → [api.zuno.ashishjha.xyz](https://api.zuno.ashishjha.xyz) |
| Nginx | Reverse proxy + TLS | Let's Encrypt via Certbot |
| Neon | PostgreSQL | Managed database |

```mermaid
flowchart LR
    user[User] --> nginx[Nginx + Let's Encrypt]
    nginx -->|zuno.ashishjha.xyz| web[Next.js :3000]
    nginx -->|api.zuno.ashishjha.xyz| api[Express API :4000]
    web -->|JWT cookie| api
    api --> postgres[Neon PostgreSQL]
    api --> e2b[E2B sandbox]
    api --> deepseek[DeepSeek]
    api --> github[GitHub API]
    e2b -->|preview URL| web
```

1. **Create** - `POST /api/v1/project` inserts the project and returns `{ id }` immediately. Sandbox + DeepSeek run in the background.
2. **Builder** - polls project state, iframes the E2B preview, and sends chat to `/conversation`. The morph overlay stays until generation finishes.
3. **Idle** - the open tab sends a heartbeat. After 30 minutes with no heartbeat, unpublished projects are killed and deleted.
4. **Publish / export** - publish keeps the preview online; GitHub push and `.zip` download export the sandbox source.

Project files live in the sandbox. Postgres stores users, project metadata, and chat.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) `>= 1.3`
- Node.js `>= 20`
- PostgreSQL (local, Docker, or [Neon](https://neon.tech))
- [E2B](https://e2b.dev) API key
- [DeepSeek](https://platform.deepseek.com) API key
- Optional: GitHub OAuth App (Push to GitHub), AWS S3 if you use related uploads

### Install

```bash
git clone https://github.com/ashishxjhaa/Zuno.git
cd Zuno
bun install
```

### Environment

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Fill in the values (see [Environment Variables](#environment-variables)).

### Database

```bash
cd apps/server && bunx prisma migrate dev
```

### Run locally

```bash
# from repo root
bun run dev
```

Or separately:

```bash
cd apps/server && bun run dev   # http://localhost:4000
cd apps/web && bun run dev      # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000).

Production runs on a single EC2 instance (PM2 + Nginx). See [Deployment](#deployment).

---

## Environment Variables

### `apps/server/.env`

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_SECRET` | Yes | Auth token signing |
| `FRONTEND_URL` | Yes | Web origin (`http://localhost:3000` locally; `https://zuno.ashishjha.xyz` in production; no trailing slash) |
| `E2B_API_KEY` | Yes | E2B sandbox API key |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key |
| `PORT` | No | API port (default `4000`) |
| `E2B_TEMPLATE_REACT_TS` / `_JS` / `NEXT_TS` / `NEXT_JS` | Prod speed | Prebaked template aliases |
| `GITHUB_CLIENT_ID` | GitHub push | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub push | OAuth App client secret |
| `GITHUB_CALLBACK_URL` | GitHub push | Must match the OAuth App callback (`http://localhost:4000/api/v1/github/oauth/callback` locally; `https://api.zuno.ashishjha.xyz/api/v1/github/oauth/callback` in production) |

### `apps/web/.env`

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | API origin only (`http://localhost:4000` locally; `https://api.zuno.ashishjha.xyz` in production). Do not append `/api/v1` |

---

## Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start web + server via Turborepo |
| `bun run build` | Production build across the monorepo |
| `bun run lint` | Lint all packages |
| `bun run typecheck` | Typecheck all packages |
| `cd apps/server && bun run dev` | API on port 4000 |
| `cd apps/web && bun run dev` | Next.js on port 3000 |
| `cd apps/server && bunx prisma migrate dev` | Apply migrations |

---

## Routes

| Route | Auth | Description |
| :--- | :--- | :--- |
| `/` | Public | Landing page |
| `/signin` | Public | Sign in |
| `/signup` | Public | Create an account |
| `/projects/:id` | Required | Preview, code, chat, GitHub, download |

---

## API

Auth is under `/api/v1/auth`. Projects are under `/api/v1/project`. Project routes require a session cookie.

| Method | Path | Body |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | `{ name, email, password }` |
| `POST` | `/api/v1/auth/signin` | `{ email, password }` |
| `POST` | `/api/v1/auth/signout` | (none) |
| `GET` | `/api/v1/auth/me` | (none) |
| `POST` | `/api/v1/project` | `{ initialPrompt }` |
| `GET` | `/api/v1/project/:id` | (none) |
| `POST` | `/api/v1/project/:id/conversation` | `{ contents }` |
| `POST` | `/api/v1/project/:id/heartbeat` | (none) |
| `POST` | `/api/v1/project/:id/publish` | (none) |
| `GET` | `/api/v1/project/:id/download` | (none) - source zip |

GitHub OAuth + push live under `/api/v1/github/*` (connect popup, link repo, push from sandbox).

---

## Deployment

Zuno is fully self-hosted on a **single AWS EC2 instance**. Next.js and the Bun API run under PM2 on loopback; Nginx reverse-proxies public HTTPS hostnames to those ports. TLS is Let's Encrypt via Certbot. Postgres is [Neon](https://neon.tech). Sandboxes are E2B; generation uses DeepSeek; GitHub push uses a GitHub OAuth App.

| Public URL | Nginx routes to |
| :--- | :--- |
| [https://zuno.ashishjha.xyz](https://zuno.ashishjha.xyz) | `127.0.0.1:3000` (Next.js 16) |
| [https://api.zuno.ashishjha.xyz](https://api.zuno.ashishjha.xyz) | `127.0.0.1:4000` (Bun + Express) |

| Process | How it runs |
| :--- | :--- |
| Frontend | `apps/web` — `next start` on port **3000**, managed by PM2 |
| Backend | `apps/server` — Bun + Express on port **4000**, managed by PM2 |
| Reverse proxy | Nginx on **80** / **443** |
| TLS | Let's Encrypt + Certbot |
| Database | Neon PostgreSQL |

The API is a long-running process (background E2B builds, idle reaper, `app.listen`). It is not a serverless function.

### Host and DNS

1. Provision an Ubuntu EC2 instance. Allow inbound **22**, **80**, and **443**.
2. Point both DNS A records at the instance public IP:
   - `zuno.ashishjha.xyz`
   - `api.zuno.ashishjha.xyz`
3. Install Bun (`>= 1.3`), Node.js (`>= 20`), Nginx, Certbot, and PM2.

### App on the instance

```bash
git clone https://github.com/ashishxjhaa/Zuno.git
cd Zuno
bun install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Set production values (no trailing slashes):

- `FRONTEND_URL=https://zuno.ashishjha.xyz`
- `NEXT_PUBLIC_API_URL=https://api.zuno.ashishjha.xyz`
- `GITHUB_CALLBACK_URL=https://api.zuno.ashishjha.xyz/api/v1/github/oauth/callback`

Then migrate and build:

```bash
cd apps/server && bunx prisma migrate deploy
cd ../.. && bun run build
```

`NEXT_PUBLIC_API_URL` is inlined at build time. Rebuild the web app if it changes.

### PM2

```bash
cd apps/server && pm2 start "bun src/index.ts" --name zuno-api
cd ../web && pm2 start "bun run start" --name zuno-web
pm2 save && pm2 startup
```

### Nginx and TLS

Nginx proxies by hostname:

- `zuno.ashishjha.xyz` → `http://127.0.0.1:3000`
- `api.zuno.ashishjha.xyz` → `http://127.0.0.1:4000`

Example server blocks (HTTP; Certbot will add SSL):

```nginx
server {
    listen 80;
    server_name zuno.ashishjha.xyz;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name api.zuno.ashishjha.xyz;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Issue certificates:

```bash
sudo certbot --nginx -d zuno.ashishjha.xyz -d api.zuno.ashishjha.xyz
```

### Checklist

1. `FRONTEND_URL` is `https://zuno.ashishjha.xyz` (no trailing slash).
2. `NEXT_PUBLIC_API_URL` is `https://api.zuno.ashishjha.xyz` (no `/api/v1`), then rebuild web.
3. Auth cookies use `SameSite=None; Secure` in production so credentialed requests from the web origin to the API origin succeed.
4. GitHub OAuth callback is `https://api.zuno.ashishjha.xyz/api/v1/github/oauth/callback`.

Live site: [https://zuno.ashishjha.xyz](https://zuno.ashishjha.xyz) · API: [https://api.zuno.ashishjha.xyz](https://api.zuno.ashishjha.xyz)

---

## Author

**Ashish Jha**

<p>
  <a href="https://ashishjha.xyz/">
    <img src="https://shieldcn.dev/badge/Portfolio-ashishjha.xyz-171717.svg?logo=lu:Globe&variant=default&size=sm" alt="Portfolio" />
  </a>
  &nbsp;
  <a href="https://github.com/ashishxjhaa">
    <img src="https://shieldcn.dev/badge/GitHub-ashishxjhaa-181717.svg?logo=github&variant=branded&size=sm" alt="GitHub" />
  </a>
  &nbsp;
  <a href="https://x.com/ashishxjha">
    <img src="https://shieldcn.dev/badge/X-ashishxjha-000000.svg?logo=x&variant=branded&size=sm" alt="X" />
  </a>
  &nbsp;
  <a href="https://www.linkedin.com/in/ashishxjha/">
    <img src="https://shieldcn.dev/badge/LinkedIn-ashishxjha-0A66C2.svg?logo=linkedin&variant=branded&size=sm" alt="LinkedIn" />
  </a>
</p>

---

<p align="center">
  <a href="https://zuno.ashishjha.xyz">
    <img src="https://shieldcn.dev/badge/Try-Zuno-FF5800.svg?logo=lu:Rocket&variant=default&size=lg" alt="Try Zuno" />
  </a>
</p>
