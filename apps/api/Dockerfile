FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile=false

EXPOSE 3001
CMD ["/app/node_modules/.bin/tsx", "apps/api/src/index.ts"]
