# syntax=docker/dockerfile:1
#
# Multi-stage build: the image compiles the frontend itself, so `docker compose build`
# works from a clean checkout with no host `yarn build` (see docs/frontend-image.md).
#
#   docker build -t nawi-emr-frontend .                                  # production config
#   docker build --build-arg EMR_CONFIG=config.local.js -t nawi-emr-frontend .
#
# The production config derives every backend URL from the page origin, so one image
# serves any deployment that fronts the stack with resources/caddy/Caddyfile.

FROM node:22-bookworm AS build
ARG EMR_CONFIG=config.production.js
# HUSKY=0 skips the git-hook install in the fhir-emr workspace's `prepare` (no .git here).
# gettext provides msgcat for `yarn extract` (scripts/preextract-merge-po.sh).
ENV HUSKY=0 \
    NODE_OPTIONS=--max-old-space-size=4096 \
    DISABLE_ESLINT_PLUGIN=true
RUN apt-get update && apt-get install -y --no-install-recommends gettext && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN cp contrib/emr-config/${EMR_CONFIG} contrib/emr-config/config.js \
 && cp public/index.production.html index.html \
 && yarn install --frozen-lockfile \
 && yarn extract \
 && yarn compile \
 && yarn build

FROM node:22-alpine
RUN yarn global add serve && mkdir /app
COPY --from=build /app/build /app
WORKDIR /app
EXPOSE 5000
ENV PORT=5000
CMD ["serve", "-s", "-n", "-l", "tcp://0.0.0.0:5000"]
