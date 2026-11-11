# syntax=docker/dockerfile:1
#
# Dungeon Crusade relay server + web build in one image.
#   docker build -t dungeon-crusade .
#   docker run --rm -p 8787:8787 dungeon-crusade      -> http://localhost:8787
# Deployed to Fly.io with fly.toml (see platforms/README.md).

# ---------------------------------------------------------------- build
FROM node:22-bookworm-slim AS build
# ffmpeg: the asset pipeline (tools/build-assets.mjs) transcodes the original Unity audio.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Optional build-time overrides (import.meta.env). Not needed when the web
# build is served by this server: it then talks to its own origin (/ws).
ARG VITE_SERVER_URL
ARG VITE_PUBLIC_URL
RUN npm run build && npm run build:server

# ------------------------------------------------- production node_modules
# The server bundle keeps npm packages external (esbuild --packages=external).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# -------------------------------------------------------------- runtime
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    STATIC_DIR=/app/dist
WORKDIR /app
# Files stay root-owned (read-only for the app); the process runs as `node`.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY package.json ./
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist-server/index.mjs"]
