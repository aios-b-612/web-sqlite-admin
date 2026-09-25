# template-frontend — Next.js Ecme standalone (padrão Octor frontend)
# Build args NEXT_PUBLIC_* entram no bundle em build time (como VITE_*).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_AUTH_API_URL=https://auth.octor.com.br/v1
ARG NEXT_PUBLIC_AUTH_PORTAL_URL=https://auth.octor.com.br
ARG NEXT_PUBLIC_APP_ID=
ARG NEXT_PUBLIC_APP_MENU_ENV=production
ARG NEXT_PUBLIC_CENTRAL_AUTH_ENABLED=true

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_AUTH_API_URL=$NEXT_PUBLIC_AUTH_API_URL \
    NEXT_PUBLIC_AUTH_PORTAL_URL=$NEXT_PUBLIC_AUTH_PORTAL_URL \
    NEXT_PUBLIC_APP_ID=$NEXT_PUBLIC_APP_ID \
    NEXT_PUBLIC_APP_MENU_ENV=$NEXT_PUBLIC_APP_MENU_ENV \
    NEXT_PUBLIC_CENTRAL_AUTH_ENABLED=$NEXT_PUBLIC_CENTRAL_AUTH_ENABLED \
    AUTH_SECRET=build-time-placeholder \
    AUTH_TRUST_HOST=true \
    NEXTAUTH_URL=http://localhost:3000/

RUN node scripts/check-build-env.mjs && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    AUTH_SECRET=runtime-placeholder \
    AUTH_TRUST_HOST=true

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
