FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lockb ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
RUN bun install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN bun run --cwd apps/api build

FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y \
  chromium \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]
