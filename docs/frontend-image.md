# Frontend Docker image

How the `beda-frontend` image is built, and the history of why it looks the way it does.

## Status

All three items below are now done (2026-10-27, as part of the VPS deployment work in `docs/deployment.md`):

- `Dockerfile` is the multi-stage build from item 1, with `EMR_CONFIG` as a build arg, `HUSKY=0` so the fhir-emr workspace's `prepare` does not try to install git hooks, and `gettext` installed because `yarn extract` needs `msgcat`. `docker compose build beda-frontend` works from a clean checkout. `build/` is now in `.dockerignore`.
- `beda-frontend` is behind the `frontend` Compose profile (item 2); `docker-compose.prod.yml` resets the profile so production always runs it.
- CI (`.github/workflows/main.yml`) no longer runs `yarn build` on the host (item 3); it keeps install → extract → compile → typecheck as a fast gate, then builds and pushes the image for `linux/amd64` with a GHA layer cache.

The production config the image bakes in (`contrib/emr-config/config.production.js`) derives every URL from `window.location.origin`, so the same image serves any deployment.

The rest of this document is the original decision record, kept for the reasoning.

## What existed before

`Dockerfile` was a **prebuilt-artifact image**. It did not build the application; it copied a directory the host had already produced:

```dockerfile
FROM node:lts
RUN yarn global add serve
RUN mkdir /app
COPY /build /app          # <- must already exist on the host
WORKDIR /app
EXPOSE 5000
CMD serve -s -n -l tcp://0.0.0.0:5000
```

`vite.config.ts` sets `build.outDir` to `build/`, so `yarn build` is what produces it.

CI (`.github/workflows/main.yml`) satisfies that contract explicitly, in this order:

1. `cp contrib/emr-config/config.production.js contrib/emr-config/config.js`
2. `yarn install`
3. `yarn extract` → `yarn compile` (lingui message catalogues)
4. `yarn typecheck` → `yarn lint`
5. `yarn build` → writes `build/`
6. `docker build` + push to ghcr

So the pipeline works. The host build and the image build are two separate steps held together by convention.

### Why it fails locally

`docker compose up` tries to build `beda-frontend`, `build/` does not exist because nobody ran `yarn build`, and the image build dies at `COPY /build /app`:

```text
failed to compute cache key: "/build": not found
```

This is not a misconfiguration — it is the prebuilt-artifact pattern behaving as designed. The image depends on host state that Compose has no way to produce.

It has never mattered in practice, because local development does not use this image at all:

| | Local dev | Production |
| --- | --- | --- |
| Server | Vite dev server | `serve` inside the image |
| Port | 3000 | 5000 |
| Built by | nothing — transforms on request | CI |

Port 5000 is also taken by macOS Control Center (AirPlay Receiver) on a default macOS install, so the container could not bind it locally anyway without turning that off.

## Done: `.dockerignore`

Added, and the reason was more than tidiness.

**Before:** no `.dockerignore` at all, so the build context was **~1.6 GB** — 1.4 GB root `node_modules` plus 153 MB under `contrib/fhir-emr/node_modules` — uploaded to the Docker daemon on every build. **After:** 9.64 MB.

More importantly, `.env` was in the context. It holds `POSTGRES_KEYCLOAK_PASSWORD`, `KC_BOOTSTRAP_ADMIN_PASSWORD` and `POSTGRES_HAPI_PASSWORD`. Nothing secret reached the published image, because the Dockerfile only copies `build/` — but the context is uploaded regardless, and a multi-stage build (below) would `COPY . .` those secrets into a builder layer. Builder layers are discarded from the final image but remain in the local build cache and are inspectable. Excluding `.env` is therefore a prerequisite for the multi-stage change, not an optional cleanup.

### The one rule to preserve

**`build/` must never be added to `.dockerignore`** while the current Dockerfile exists. Ignoring it silently breaks `COPY /build /app`, and the failure surfaces in CI at image-build time rather than locally. The file carries a comment saying so; this was verified by probing the context with a throwaway image.

Verified after the change: `.env` excluded, `.env.template` kept, both `node_modules` trees excluded, and `src/`, `public/`, `contrib/emr-config/`, `package.json`, `yarn.lock`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `scripts/` and `lingui.config.ts` all still present.

## Open items

### 1. Multi-stage build — recommended

**What.** Move the build inside the image, so `docker build` produces the bundle rather than consuming one.

**Why.** An image that copies a host-produced directory is not reproducible. It silently depends on whether someone ran `yarn build`, against which config, at which commit. The local failure above is that fragility surfacing. Building inside the image makes `docker compose up` work from a clean checkout with no host prerequisites.

**How.** The build is not merely `yarn build` — it has to replicate CI's full sequence:

```dockerfile
FROM node:lts AS build
ARG EMR_CONFIG=config.production.js
WORKDIR /app
COPY . .
RUN cp contrib/emr-config/${EMR_CONFIG} contrib/emr-config/config.js \
 && cp public/index.production.html index.html \
 && yarn install --frozen-lockfile \
 && yarn extract && yarn compile && yarn build

FROM node:lts-slim
RUN yarn global add serve
COPY --from=build /app/build /app
WORKDIR /app
EXPOSE 5000
ENV PORT="5000"
CMD serve -s -n -l tcp://0.0.0.0:5000
```

Four details that will bite if missed:

- **`config.js` is environment-specific and gitignored.** `yarn build` runs `check-config`, which fails if it is absent. Hence the `ARG`; local builds pass `--build-arg EMR_CONFIG=config.local.js`.
- **`index.production.html` must replace `index.html`.** CI does this; it is easy to overlook because the local file is present and looks fine.
- **`contrib/fhir-emr` is a git submodule.** The context only contains it if it is checked out, so CI needs `submodules: recursive` (it already has this). A shallow or submodule-less checkout produces a confusing resolution failure rather than a clear error.
- **Yarn workspaces (`workspaces: ["contrib/*"]`).** One root `yarn install` covers the submodule, and the root `prepare` script (`yarn workspace @beda.software/emr prepare && yarn compile`) builds `contrib/fhir-emr/dist`. Do not add `contrib/*/dist` to `.dockerignore` without confirming `prepare` actually regenerates it in a clean container.

**Cost.** CI would run `yarn install` twice: once on the host for the typecheck and lint gates, once inside the image. Keep the host gates — they fail fast without Docker — and drop the host `yarn build`, which the image then owns. If the duplicate install becomes annoying, BuildKit cache mounts (`--mount=type=cache,target=/usr/local/share/.cache/yarn`) remove most of it.

**Definition of done.** `docker compose build beda-frontend` succeeds on a clean checkout with no prior `yarn build`; the served bundle responds on its port; CI still publishes a working image.

### 2. Put `beda-frontend` behind a Compose profile

**What.** Add `profiles: ["frontend"]` to the `beda-frontend` service in `docker-compose.yml`.

**Why.** Local development never uses this service, yet `make up-dev` tries to build it and fails, which looks alarming and buries real errors in the output. A profile means it is only built when explicitly asked for (`docker compose --profile frontend up -d`), while `make up` / `make up-dev` bring up the backend cleanly.

**Caveat.** Confirm the deployment path does not rely on a bare `docker compose up` including this service. CI builds and pushes the image directly rather than via Compose, so this is expected to be safe — verify before merging.

### 3. Trim CI once the multi-stage build lands

**What.** Drop `yarn build` from `.github/workflows/main.yml`; keep `yarn install`, `extract`, `compile`, the role-safety check, `typecheck` and `lint`.

**Why.** Once the image builds itself, a host build is duplicated work and reintroduces the drift the multi-stage change removes — two build paths that can disagree.

**Order.** This must land *after* the multi-stage Dockerfile, never before, or CI will push an image built from a stale or absent `build/`.

## Suggested sequence

1. ~~`.dockerignore`~~ — done.
2. Compose profile — small, independent, stops the noisy local failure immediately.
3. Multi-stage Dockerfile — the substantive change.
4. CI trim — only after 3 is proven.

Steps 2 and 3 are independent; 4 depends on 3.
