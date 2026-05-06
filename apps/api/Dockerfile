FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN npm install -g tsx

COPY . .
RUN pnpm install --frozen-lockfile=false

ENV NODE_ENV=production
EXPOSE 3001
CMD ["tsx", "apps/api/src/index.ts"]
