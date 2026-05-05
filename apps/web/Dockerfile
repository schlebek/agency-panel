FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run --cwd apps/web build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["bun", "apps/web/server.js"]
