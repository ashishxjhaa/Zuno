# Long-running Bun + Express API (not for Vercel serverless).
FROM oven/bun:1.3
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server ./apps/server
COPY packages ./packages

RUN bun install --frozen-lockfile
WORKDIR /app/apps/server
RUN bunx prisma generate

ENV NODE_ENV=production
EXPOSE 4000
CMD ["bun", "src/index.ts"]
