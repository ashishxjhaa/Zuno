# Zuno API — long-running Bun + Express (deploy on Railway, not Vercel).
FROM oven/bun:1.3

WORKDIR /app

# Workspace manifests first for better layer caching
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

RUN bun install --frozen-lockfile

# Server source + Prisma
COPY apps/server ./apps/server

WORKDIR /app/apps/server
RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["bun", "src/index.ts"]
