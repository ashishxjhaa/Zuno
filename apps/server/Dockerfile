# EC2 API image when build context is apps/server.
# Example: docker build -t zuno-api -f apps/server/Dockerfile apps/server
FROM oven/bun:1.3
WORKDIR /app

COPY package.json ./
RUN bun install

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src
COPY templates ./templates

RUN bunx prisma generate

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["bun", "src/index.ts"]
