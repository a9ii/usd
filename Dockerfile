
# ==============================================
# Base: install dependencies
# ==============================================

FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@11.25.0 --activate

COPY package.json \
     pnpm-lock.yaml \
     pnpm-workspace.yaml \
     .npmrc ./

RUN pnpm install --frozen-lockfile


# ==============================================
# Build: compile Vinext application
# ==============================================

FROM base AS build

WORKDIR /app

ARG SITE_URL

ENV SITE_URL=${SITE_URL}
ENV DEPLOY_TARGET=vps

COPY . .

# Disable Cloudflare config only inside the build
# so Vinext builds for the VPS Node runtime.

RUN if [ -f wrangler.jsonc ]; then \
      mv wrangler.jsonc wrangler.jsonc.cloudflare-disabled; \
    fi \
    && pnpm run build:vps \
    && test -f dist/server/index.js \
    && test -f dist/server/ssr/index.js \
    && test -d dist/client


# ==============================================
# Runtime: production container
# ==============================================

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy dependencies, without the pnpm download
# cache from the build environment.
COPY --from=base --chown=node:node \
    /app/node_modules ./node_modules

# Copy compiled application
COPY --from=build --chown=node:node \
    /app/dist ./dist

COPY --chown=node:node \
    package.json ./package.json

COPY --chown=node:node \
    server.mjs ./server.mjs

USER node

EXPOSE 3000


HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.mjs"]
