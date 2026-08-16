# Builds and runs on Raspberry Pi (arm64) the same way it does on amd64 — no
# cross-compilation needed if you run `docker build` directly on the Pi.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the client bundle so the running app can show what it was built from —
# see deploy/auto-update.sh, which sets these before each rebuild.
ARG GIT_SHA=dev
ARG BUILD_TIME=
ENV NEXT_PUBLIC_GIT_SHA=$GIT_SHA
ENV NEXT_PUBLIC_BUILD_TIME=$BUILD_TIME
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
