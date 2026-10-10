# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.js reads DATABASE_URL; a placeholder is enough to generate the client.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
USER node
EXPOSE 5000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
