# Nawi EMR

A customized clinical EMR built on [Beda EMR](https://github.com/beda-software/fhir-emr), using HAPI FHIR + Keycloak + fhir-gateway as the backend stack.

## Architecture

| Service | Port | Description |
|---|---|---|
| Keycloak | 8080 | OIDC identity provider |
| HAPI FHIR | 8082 | FHIR R4 server |
| fhir-gateway | 8084 | Auth-enforcing FHIR proxy |
| fhir-sdc | 8083 | Structured data capture |
| Frontend (dev) | 3000 | Vite dev server |
| Frontend (prod) | 5000 | Built frontend |

## Local dev bootstrap

### Prerequisites

- Docker + Docker Compose
- Node.js 20+, Yarn
- Add to `/etc/hosts`: `127.0.0.1 host.docker.internal` (Linux only)

### 1. Clone with submodules

```sh
git clone --recurse-submodules <repo-url>
# or after clone:
git submodule update --init
```

### 2. Configure environment

```sh
cp .env.tpl .env
```

Edit `.env` and set:

```
POSTGRES_KEYCLOAK_PASSWORD=<choose a password>
KC_BOOTSTRAP_ADMIN_PASSWORD=<choose a password>
```

### 3. Start backend services

```sh
docker compose up -d
```

Services start in order: Postgres → Keycloak → HAPI FHIR → fhir-gateway. Keycloak realm and seed users are imported automatically. FHIR seed resources are uploaded once HAPI is ready.

To follow startup progress:

```sh
docker compose logs -f keycloak-ready hapi-fhir-ready upload-fhir-bundle
```

### 4. Install frontend dependencies

```sh
yarn
yarn extract
yarn compile
```

### 5. Start frontend

```sh
yarn start
```

Open http://localhost:3000 and select **OHS FHIR Gateway (HAPI + Keycloak) - Local** on the sign-in screen.

## Seed accounts

| Role | Username | Password |
|---|---|---|
| Practitioner | `practitioner` | `password` |
| Patient | `patient` | `password` |

## Auth flow

The frontend uses Keycloak's authorization code flow (PKCE). After login, tokens are stored in `localStorage`. A silent refresh interceptor automatically exchanges the refresh token when the access token expires. Logout redirects to Keycloak's end-session endpoint to terminate the SSO session.

## Customizing contrib

The `contrib/fhir-emr` submodule is the base EMR. After editing contrib source, rebuild its dist:

```sh
yarn prepare
```

Then stage the submodule pointer:

```sh
git add contrib/fhir-emr
git commit -m "Update submodule"
```

## Language locales

After adding new translatable strings:

```sh
yarn extract   # extract new messages
# add translations in src/locale/
yarn compile   # compile for runtime
```

## Imports troubleshooting

**TypeScript error: `Module has no exported member`**

Ensure the symbol is explicitly re-exported from the relevant `@beda.software/emr/*` entry point.

**ESLint `import/no-unresolved` on a type import**

Use `import type`:
```ts
import type { Dashboard } from '@beda.software/emr/dist/components/Dashboard/types';
```
