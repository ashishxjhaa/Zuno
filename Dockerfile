# EC2 API image only (frontend deploys on Vercel).
# Build from repo root: docker build -t zuno-api .
FROM oven/bun:1.3
WORKDIR /app

COPY apps/server/package.json ./
RUN bun install

COPY apps/server/prisma ./prisma
COPY apps/server/prisma.config.ts ./
COPY apps/server/tsconfig.json ./
COPY apps/server/src ./src
COPY apps/server/templates ./templates

RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["bun", "src/index.ts"]
