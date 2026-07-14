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

### 2. Bring up the stack

```sh
docker compose -f docker-compose.dev.yml up -d
```

This starts the services **and seeds the FHIR server** — the one-shot `*-fhir-bundle`
services export `resources/fhir-seeds*` and POST them to HAPI once it is healthy. There
is no separate seed step. `beda-frontend` is behind a `frontend` profile and does not
start by default; run the app with `corepack yarn start`.

### 3. Configure environment

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

| Role           | Username         | Email                       | Password   | FHIR resource            |
| -------------- | ---------------- | --------------------------- | ---------- | ------------------------ |
| Administrator  | `administrator`  | administrator@nawi-emr.com  | `password` | `Organization/org-1001`  |
| Clinician      | `clinician`      | clinician@nawi-emr.com      | `password` | `Practitioner/prac-1000` |
| Receptionist   | `receptionist`   | receptionist@nawi-emr.com   | `password` | `Practitioner/prac-1001` |
| Triage Nurse   | `triage-nurse`   | triage.nurse@nawi-emr.com   | `password` | `Practitioner/prac-1002` |
| Lab Technician | `lab-technician` | lab.technician@nawi-emr.com | `password` | `Practitioner/prac-1003` |
| Pharmacist     | `pharmacist`     | pharmacist@nawi-emr.com     | `password` | `Practitioner/prac-1004` |
| Cashier        | `cashier`        | cashier@nawi-emr.com        | `password` | `Practitioner/prac-1005` |
| Patient        | `patient`        | patient@nawi-emr.com        | `password` | `Patient/pat-1001`       |

> **Reseeding after seed changes:** Keycloak persists realm data in a Docker volume. To force a clean reimport of the realm and all seed users, run:
>
> ```sh
> docker compose down -v
> docker compose up -d
> ```

## Role-based navigation

Each Keycloak user is assigned exactly one role. After login, `matchCurrentUserRole` (in `src/utils/role.ts`) reads the first entry of `user.role[]` and dispatches to the matching branch.

Two files together control what a user can see and visit:

| File                            | Purpose                                   |
| ------------------------------- | ----------------------------------------- |
| `src/containers/App/layout.tsx` | Sidebar menu items shown to each role     |
| `src/containers/App/routes.tsx` | React Router routes mounted for each role |

The default redirect after login is the first path in the role's `menuLayout` array.

### Menu and route matrix

```
Receptionist
├── Patients          /patients
└── Scheduling        /scheduling

Triage Nurse
└── Patients          /patients

Clinician
└── Patients          /patients

Lab Technician
└── Patients          /patients

Pharmacist
└── Patients          /patients

Cashier
└── Patients          /patients

Administrator
├── Patients          /patients
├── Scheduling        /scheduling
├── Organizations     /organizations
└── Locations         /locations

Patient
└── Patient (own record)  /patients/:id/*
```

All roles with `/patients` also get sub-route `/patients/:id/*`.

### Changing menu items for a role

Edit `src/containers/App/layout.tsx`. Add, remove, or reorder entries in the array returned for the target role. Each entry is:

```ts
{ label: t`Label`, path: '/route-path', icon: <SomeIcon /> }
```

`t\`...\``marks the label as translatable — run`yarn extract && yarn compile` after adding new strings.

### Changing routes for a role

Edit the matching `Authenticated<Role>Routes` component in `src/containers/App/routes.tsx`. Add or remove `<Route>` elements to match what you set in the menu layout.

Keep the menu items and routes in sync: a menu entry without a matching route silently redirects to the default page; a route without a menu entry is unreachable via the sidebar but still accessible by direct URL.

### Adding a new role

1. Add the role string to the `Role` enum in `src/utils/role.ts`.
2. Add the role's menu items to `menuLayout` in `src/containers/App/layout.tsx`.
3. Add a new `Authenticated<NewRole>Routes` component in `src/containers/App/routes.tsx` and register it in `AuthenticatedRoutesContent`.
4. Add the role to the Keycloak realm configuration and create a seed user (see [Seed accounts](#seed-accounts)).
5. Add FHIR gateway access rules for the role in `resources/gateway-config/`.

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
