FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile=false

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter @agency/web build
RUN cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static && \
    cp -r apps/web/public apps/web/.next/standalone/apps/web/public 2>/dev/null || true

EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]
