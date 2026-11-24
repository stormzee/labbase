# syntax=docker/dockerfile:1.7

# ---------- build ----------
FROM node:24-alpine AS build

RUN npm install --global pnpm@11.28.5
WORKDIR /app

# Dependency layer first so source edits do not reinstall packages.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

# nginx:alpine's entrypoint starts nginx in the foreground.
