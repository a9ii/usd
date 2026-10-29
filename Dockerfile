FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN pnpm install --frozen-lockfile


# Build production application without code audits
FROM base AS build

COPY . .

ARG SITE_URL

ENV SITE_URL=${SITE_URL}
ENV DEPLOY_TARGET=vps

RUN if [ -f wrangler.jsonc ]; then \
      mv wrangler.jsonc wrangler.jsonc.cloudflare-disabled; \
    fi \
    && pnpm run build:vps


# Production runtime
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build --chown=node:node \
    /app/dist/standalone ./dist/standalone

USER node

EXPOSE 3000

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/standalone/server.js"]
