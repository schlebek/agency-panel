FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install
RUN bun run --cwd apps/api build

FROM oven/bun:1 AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y \
  chromium \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages ./packages

EXPOSE 3001
CMD ["bun", "run", "dist/index.js"]
