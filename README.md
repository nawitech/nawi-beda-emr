# Nawi EMR

A customized clinical EMR built on [Beda EMR](https://github.com/beda-software/fhir-emr), using HAPI FHIR + Keycloak + fhir-gateway as the backend stack.

## Architecture

| Service         | Port | Description               |
| --------------- | ---- | ------------------------- |
| Keycloak        | 8080 | OIDC identity provider    |
| HAPI FHIR       | 8082 | FHIR R4 server            |
| fhir-gateway    | 8084 | Auth-enforcing FHIR proxy |
| fhir-sdc        | 8083 | Structured data capture   |
| Frontend (dev)  | 3000 | Vite dev server           |
| Frontend (prod) | 5000 | Built frontend            |
| pgweb _(dev)_   | 8085 | PostgreSQL web UI         |

## Local dev bootstrap

### Prerequisites

-   Docker + Docker Compose
-   Node.js 20+, Yarn
-   Add to `/etc/hosts`: `127.0.0.1 host.docker.internal` (Linux only)

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
make up        # production stack (pull, build, start)
make up-dev    # + dev tools: pgweb (8085), fhir-seeds watcher
```

Services start in order: Postgres → Keycloak → HAPI FHIR → fhir-gateway. Keycloak realm and seed users are imported automatically. FHIR seed resources are uploaded once HAPI is ready.

To follow startup progress:

```sh
docker compose logs -f keycloak-ready hapi-fhir-ready upload-fhir-bundle
```

Other Makefile targets:

| Target             | Description                                         |
| ------------------ | --------------------------------------------------- |
| `make up`          | Pull, build, and start the production stack         |
| `make stop`        | Stop the production stack                           |
| `make restart`     | Stop, pull, build, and restart the production stack |
| `make up-dev`      | Same as `up`, plus dev-only services                |
| `make stop-dev`    | Stop the dev stack                                  |
| `make restart-dev` | Stop, pull, build, and restart the dev stack        |

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

| Role           | Username         | Email                          | Password   | FHIR resource            |
| -------------- | ---------------- | ------------------------------ | ---------- | ------------------------ |
| Administrator  | `administrator`  | administrator@nawi-emr.com     | `password` | `Organization/org-1001`  |
| Clinician      | `clinician`      | clinician@nawi-emr.com         | `password` | `Practitioner/prac-1000` |
| Receptionist   | `receptionist`   | receptionist@nawi-emr.com      | `password` | `Practitioner/prac-1001` |
| Triage Nurse   | `triage-nurse`   | triage.nurse@nawi-emr.com      | `password` | `Practitioner/prac-1002` |
| Lab Technician | `lab-technician` | lab.technician@nawi-emr.com    | `password` | `Practitioner/prac-1003` |
| Pharmacist     | `pharmacist`     | pharmacist@nawi-emr.com        | `password` | `Practitioner/prac-1004` |
| Cashier        | `cashier`        | cashier@nawi-emr.com           | `password` | `Practitioner/prac-1005` |
| Patient        | `patient`        | patient@nawi-emr.com           | `password` | `Patient/pat-1001`       |

> **Reseeding after seed changes:** Keycloak persists realm data in a Docker volume. To force a clean reimport of the realm and all seed users, run:
>
> ```sh
> docker compose down -v
> docker compose up -d
> ```

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
