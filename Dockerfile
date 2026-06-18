# Simple self-host image. SQLite DB persists via a mounted volume at /data.
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (postinstall runs `prisma generate`).
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# Build the app.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:/tmp/build.db"
RUN npm run build

# Runtime image.
FROM base AS runner
ENV DATABASE_URL="file:/data/prod.db"
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && mkdir -p /data

VOLUME ["/data"]
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
