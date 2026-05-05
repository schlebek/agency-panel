FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

COPY . .
RUN npm install --legacy-peer-deps

EXPOSE 3001
CMD ["npx", "tsx", "apps/api/src/index.ts"]
