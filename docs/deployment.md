# Deploying to a VPS

How to run Nawi EMR on a single Linux virtual server, what the production stack changes relative to local development, and what still has to happen by hand before real patients are involved.

## What you get

One public URL. Caddy terminates TLS and routes by path; nothing else publishes a host port.

```text
internet ──► Caddy :443 ──┬── /          beda-frontend   (static bundle)
                          ├── /fhir/*    fhir-gateway ──► HAPI FHIR ──► Postgres
                          ├── /kc/*      Keycloak     ──► Postgres
                          └── /sdc/*  ─► [token check against Keycloak] ─► fhir-sdc ──► HAPI
```

| Path | Upstream | Who checks the token |
| --- | --- | --- |
| `/` | `beda-frontend` | nobody — it is a public static bundle |
| `/fhir/*` | `fhir-gateway` | the gateway itself (`TOKEN_ISSUER`, `RUN_MODE=PROD`) |
| `/kc/*` | Keycloak | Keycloak |
| `/sdc/*` | `fhir-sdc` | Caddy, by replaying the request's bearer token against Keycloak's `userinfo` endpoint |

The last row matters. `fhir-sdc` has no authentication of its own and writes straight to HAPI; in development it is simply exposed on `:8083`. On a server that would be an unauthenticated write path into the clinical database, so the proxy refuses any `/sdc` request that does not carry a valid access token. The browser already sends the same token it uses for `/fhir`, so the application does not know the difference.

Everything is driven by **one variable**, `EMR_PUBLIC_URL`. It becomes Caddy's site address, Keycloak's fixed hostname (`<url>/kc`), the issuer the gateway trusts (`<url>/kc/realms/beda-emr`), and the redirect URI the realm allows (`<url>/*`). The frontend derives its URLs from the page origin at runtime, so the built image contains no hostname and one image serves any deployment.

The files involved:

| File | Role |
| --- | --- |
| `docker-compose.prod.yml` | Overlay on `docker-compose.yml`: removes host ports, hardens Keycloak and the gateway, adds Caddy, always starts the frontend, uploads the identity bootstrap |
| `resources/caddy/Caddyfile` | The routing table above |
| `Dockerfile` | Multi-stage build of the frontend; no host `yarn build` needed |
| `contrib/emr-config/config.production.js` | Origin-derived frontend config baked into the image |
| `resources/keycloak-seeds/beda-emr-realm.json` | Realm seed; `${EMR_PUBLIC_URL}`, `${EMR_SSL_REQUIRED}` and `${EMR_SEED_PASSWORD}` are substituted on first import |
| `scripts/backup.sh` | Dumps both databases |
| `Makefile` | `up-prod`, `up-prod-pull`, `stop-prod`, `restart-prod`, `logs-prod`, `ps-prod`, `backup` |

## Prerequisites

- **A VPS** running Ubuntu 22.04 or 24.04 (any systemd Linux with Docker works). Six JVM/Node services run here: HAPI, Keycloak, the gateway, fhir-sdc, the mapping engine and the converter. **4 GB RAM is the practical minimum** for running; building the frontend image on the box needs about 4 GB free at build time as well, so on a 4 GB box add swap (below) or pull the CI-built image. 2 vCPU, 40 GB disk.
- **A DNS name** with an A record (and AAAA if you have IPv6) pointing at the server, created *before* the first start, or Let's Encrypt cannot issue a certificate.
- **Ports 80 and 443** open inbound. Keep every other port closed at the provider firewall. Note that Docker publishes ports by rewriting iptables and **bypasses `ufw`**, which is why the production overlay publishes nothing but Caddy.
- A deploy key or token that can clone the repository and the `contrib/fhir-emr` submodule.

## Install

```sh
# 1. Docker (official convenience script, installs the compose plugin)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER" && newgrp docker

# 2. Swap, if the box has 4 GB or less (needed for the frontend build)
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Source
git clone --recurse-submodules https://github.com/nawitech/nawi-beda-emr.git
cd nawi-beda-emr

# 4. Configuration
cp .env.template .env
```

Edit `.env`:

```sh
POSTGRES_KEYCLOAK_PASSWORD=<random, 24+ chars>
KC_BOOTSTRAP_ADMIN_PASSWORD=<random, 24+ chars>     # Keycloak admin console
POSTGRES_HAPI_PASSWORD=<random, 24+ chars>

EMR_PUBLIC_URL=https://emr.example.com               # no trailing slash
EMR_SSL_REQUIRED=external
EMR_SEED_PASSWORD=<random, 24+ chars>                # first password of the 8 seed accounts
```

`openssl rand -hex 24` makes a suitable value. Use it rather than a hand-made password: Compose interpolates `.env`, so a `$` in an unquoted value eats everything after it up to the next non-word character (`ab$Th1cd` becomes `ab`, with a `WARN The "Th1cd" variable is not set` on every command). If a value must contain `$`, single-quote the whole value or write `$$`. **Do not leave `EMR_SEED_PASSWORD` unset:** the development default is `password`, and the realm seeds an `administrator` account with it.

## First start

```sh
make up-prod
```

This pulls the images, builds the frontend (5–10 minutes the first time, seconds after), and starts the stack. Keycloak in production mode builds its own optimised configuration on first boot, so expect a minute before it is healthy. Follow the one-shot services to see the bootstrap complete:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f \
  keycloak-ready hapi-fhir-ready upload-fhir-bundle upload-fhir-bundle-bootstrap
```

`upload-fhir-bundle` loads the questionnaires, mappings, catalogues and price list. `upload-fhir-bundle-bootstrap` loads the organisation, six practitioners, their roles, one demo patient and the gateway access List — the resources the seeded Keycloak accounts point at. Without them nobody can sign in, which is why the production overlay includes them; replacing them is covered below.

### Verify

```sh
U=https://emr.example.com
curl -sI  $U/                                   | head -1   # 200, the frontend
curl -s   $U/kc/realms/beda-emr | head -c 200              # JSON with "public_key" — the gateway reads this
curl -sI  $U/fhir/Patient                       | head -1   # 401: gateway up, no token
curl -sI -X POST $U/sdc/Questionnaire/\$populate | head -1  # 401: SDC guarded
```

Then sign in at `https://emr.example.com` as `administrator` with `EMR_SEED_PASSWORD`. The sign-in page offers one provider, "OHS FHIR Gateway (HAPI + Keycloak)"; the "- Local" entry resolves to the same URLs in production and can be ignored. A successful sign-in proves the whole chain: redirect to `/kc`, token issued with the right issuer, gateway accepting it, frontend reading the user's Organization through `/fhir`.

### Immediately after

1. **Rotate the seed passwords per person** in Keycloak (`https://emr.example.com/kc/admin/`, user `admin`, password `KC_BOOTSTRAP_ADMIN_PASSWORD`). One account per real person, no shared logins — the audit trail in `Task.requester` and `Observation.performer` is only as good as this.
2. **Disable the `patient` demo account** and any seed account the clinic will not use.
3. **Consider restricting the admin console** to known addresses; there is a commented block for it in `resources/caddy/Caddyfile`.

## Replacing the demo identities

The seed staff (`Practitioner/prac-1000` … `prac-1005`, `Organization/org-1001`, `List/list-patient-1`) are placeholders. For each real staff member:

1. Create a `Practitioner` and a `PractitionerRole` in HAPI (through the Administrator's UI, or by adding YAML under `resources/fhir-seeds-demo/` and running `make up-prod` again — the bootstrap upload is idempotent).
2. In Keycloak, create the user with the matching **realm role** (one of `receptionist`, `triage-nurse`, `clinician`, `lab-technician`, `pharmacist`, `cashier`, `administrator`) and two **attributes**: `fhirUser` = `Practitioner/<id>` and `patient_list` = the id of the access `List` (today `list-patient-1`; the receptionist's start-visit form adds every new patient to it).
3. Sign in once as that user and confirm their station queue loads.

The role matrix, the access List mechanism and why it is **not yet a security control** are in `docs/opd-authorization.md`. Read §10 of that document before putting real data on a server anyone can reach: until the role-aware gateway plugin lands, every signed-in staff account can technically read and write every resource type the allowlist permits. A deployment today should sit behind a VPN or an IP allowlist, not on the open internet.

## Updating

```sh
git pull --recurse-submodules
make up-prod
```

Seeds (`resources/fhir-seeds/`) are re-uploaded on every `up`: questionnaires, mappings and terminology are `PUT` by id, so a changed seed lands without any extra step. Two kinds of seed are create-only and never overwritten once present, because the application edits them: the price list (`ChargeItemDefinition`), and everything in the demo bootstrap bundle, which carries the patient access `List` that grows with every registration. `scripts/upload-fhir-bundle.py` does the filtering; the `--create-only` lists are in the Compose files. A seed-file change to a price therefore does not reach a running server — change it on the Price list page.

Keycloak realm changes do **not** re-import once the realm exists; make them in the admin console, or export, or `docker compose down -v` on a box that holds no data.

To run the image CI builds instead of building on the server, set `FRONTEND_IMAGE=ghcr.io/nawitech/nawi-beda-emr:latest` in `.env` and use `make up-prod-pull` (log in to GHCR first if the package is private).

## Backups

```sh
make backup                # -> backups/hapi-<stamp>.dump, backups/keycloak-<stamp>.dump
```

Put it in cron and ship the files off the machine:

```sh
0 2 * * * cd /home/deploy/nawi-beda-emr && sh scripts/backup.sh /var/backups/nawi >/dev/null 2>&1
```

Restore into a fresh stack (the archives are `pg_dump -Fc`):

```sh
PROD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$PROD stop hapi-fhir keycloak
$PROD exec -T postgres-hapi     pg_restore -U hapi     -d hapi     --clean --if-exists < backups/hapi-<stamp>.dump
$PROD exec -T postgres-keycloak pg_restore -U keycloak -d keycloak --clean --if-exists < backups/keycloak-<stamp>.dump
$PROD up -d
```

HAPI's Lucene index (`$expand` for the catalogues) lives inside the container and rebuilds on start, so it is not part of the backup. Caddy's certificates are in the `caddy_data` volume and are simply re-issued if lost.

## What is pinned and what is not

| Image | Tag | Note |
| --- | --- | --- |
| `hapiproject/hapi` | `v8.10.0-3` (overlay; dev uses `latest`) | Override with `HAPI_IMAGE_TAG` |
| `quay.io/keycloak/keycloak` | `26.5.5` | |
| `bedasoftware/fhir-sdc` | `2.1.0a3` | Has the trailing-`?` populate bug; every populate query in the seeds ends in `&_format=json` to absorb it. Newer tags fix it; bump deliberately and re-run the billing verification in `docs/opd-billing-workflow.md`. |
| `fhir-gateway` | `latest` | Google does not tag releases predictably; pin by digest once a deployment is stable |
| `caddy` | `2-alpine` | |
| `python` | `3.12-alpine` | Runs `scripts/upload-fhir-bundle.py` (standard library only) |

## Troubleshooting

**Caddy cannot get a certificate.** `docker compose logs caddy` shows the ACME error. Almost always DNS not yet pointing here, or port 80 blocked at the provider. Caddy retries on its own once fixed.

**Sign-in redirects to `localhost` or the wrong host.** The realm was imported before `EMR_PUBLIC_URL` was set, so the client's redirect URI is stale. Fix it in the admin console (Clients → beda-frontend → Valid redirect URIs) or, on an empty box, `docker compose ... down -v` and start again.

**"HTTPS required" from Keycloak.** `EMR_SSL_REQUIRED=external` with an `http://` public URL. Either serve https, or set it to `none` on a trusted network and re-import.

**Every FHIR call is 401 after sign-in.** Compare the `iss` claim in the token (`localStorage.id_token` in the browser, decode at jwt.io) with the gateway's `TOKEN_ISSUER` in `docker compose config`; in `RUN_MODE=PROD` they must match exactly, including scheme and the `/kc` path. The gateway also fetches `TOKEN_ISSUER` at startup to read the realm's public key, so the server must be able to reach its own public URL; `docker compose exec fhir-gateway curl -s $EMR_PUBLIC_URL/kc/realms/beda-emr` should return JSON.

**Forms open but never populate, or saving fails.** `/sdc` is being refused. `curl -I -H "Authorization: Bearer <token>" $U/sdc/Questionnaire/\$populate` with a fresh token must not be 401. If it is 401, Keycloak's `userinfo` is rejecting the token — expired, or issued by a different realm.

**`keycloak-ready` and/or `hapi-fhir-ready` wait forever.** Each is a loop that curls one health endpoint every 10 s over the Compose network (`http://keycloak:9000/health/ready`, `http://hapi-fhir:8080/actuator/health`) and exits when it answers. On the 4 GB box these finish in about a minute. If `up` is still showing them as `Waiting` after a few minutes, the services behind them are either not healthy or not reachable. Find out which, in this order:

```sh
PROD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$PROD ps -a                                        # 1. is keycloak / hapi-fhir Up, or Restarting / Exited?
docker inspect -f '{{.Name}} restarts={{.RestartCount}} oom={{.State.OOMKilled}}' \
  $(docker ps -aq -f name=keycloak-1 -f name=hapi-fhir-1)
$PROD logs --tail=80 keycloak hapi-fhir         # 2. the last start attempt, with the reason it failed
free -m; sudo dmesg -T | grep -iE 'killed process|out of memory' | tail   # 3. memory
NET=$(docker network ls -q -f name=nawi-beda-emr_default)                 # 4. the probes themselves
docker run --rm --network $NET curlimages/curl -sv http://keycloak:9000/health/ready
docker run --rm --network $NET curlimages/curl -sv http://hapi-fhir:8080/actuator/health
```

Neither the Keycloak nor the HAPI image contains `curl` or a shell, so `docker compose exec` into them is not an option; step 4 runs the exact probe the ready services run.

What the result means:

- **Restarting, with `Killed` / `OOMKilled=true` / an OOM line in `dmesg`.** Not enough memory. HAPI settles around 1.2 GB and Keycloak around 0.7 GB, the gateway 0.4 GB, and the frontend build on top needs ~4 GB. Add swap (Install step 2), or build the image elsewhere and `make up-prod-pull`, then `$PROD up -d` again.
- **Keycloak exits with `Unknown host` / `hostname` / `Invalid URL` errors.** `EMR_PUBLIC_URL` is unset or malformed in `.env`; the overlay sets `KC_HOSTNAME` to `$EMR_PUBLIC_URL/kc`. `$PROD config | grep KC_HOSTNAME` shows what it resolved to.
- **`password authentication failed for user "keycloak"` / `"hapi"`.** The Postgres volume was initialised by an earlier `up` with a different `.env`; Postgres only reads the password on first init, so editing `.env` afterwards changes what Keycloak and HAPI send but not what Postgres expects. A `WARN The "…" variable is not set` line at the top of every Compose command means a `$` in a `.env` value is being interpolated (see Configuration). On an empty box, fix `.env` and then `$PROD down -v` and start again; `-v` deletes both databases, which is the point here and never acceptable once the clinic has data (restore from a backup instead, Backups below).
- **Both services `Up` for a long time, no restarts, but step 4 cannot connect** (`Could not resolve host` or `Connection refused` from the throwaway container). Containers cannot talk to each other: a host firewall (ufw, firewalld, a provider's hardening image) is dropping traffic on the Docker bridge. `sudo iptables -L DOCKER-USER -n` and the firewall's own log tell you; allowing the Docker bridge interface (`docker0` and the `br-*` interface for this network) fixes it.
- **Step 4 answers `{"status":"UP"...}` but the ready containers still loop.** They started before the service was up and their own loop is fine; `$PROD logs keycloak-ready` should show the loop ending within the next 10 s. If it does not, `$PROD restart keycloak-ready hapi-fhir-ready`.

Once both probes answer, the two `upload-fhir-bundle*` one-shots run on their own; `$PROD up -d` can be re-run at any time and only completes what is missing.

**Sign-in sends the browser to a host that is not the public URL** (for example an old IP with `:8080`). The frontend image was built from stale source, so the sign-in config baked into the bundle is old. Rebuild it without the layer cache and recreate the container:

```sh
docker build --no-cache -t nawi-emr-frontend:local .
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps beda-frontend
```

Check with `curl -s $EMR_PUBLIC_URL/ | grep -o '/assets/index[^"]*'` and then grep that file for `location.origin`; the stale host must not appear anywhere in it.

**Diagnosis, lab or drug dropdowns offer nothing.** `ValueSet/$expand` needs HAPI's fulltext index. The config enables it, but a database seeded before 2026-10-27 (when the block reached the committed config) has nothing indexed and its pre-expansions recorded as failed. HAPI is not published, so run the two calls from inside the Compose network, once:

```sh
NET=$(docker network ls -q -f name=nawi-beda-emr_default)
docker run --rm --network $NET curlimages/curl -s -X POST http://hapi-fhir:8080/fhir/\$reindex-terminology -H 'Content-Type: application/fhir+json' -d '{"resourceType":"Parameters"}'
for vs in opd-diagnosis opd-lab-test opd-medication opd-billable-service opd-payment-method; do
  docker run --rm --network $NET curlimages/curl -s -o /dev/null -X POST http://hapi-fhir:8080/fhir/ValueSet/$vs/\$invalidate-expansion
done
```

If HAPI itself restarts in a loop with `HSEARCH000353: Unknown analyzer`, the `analysis.configurer` line is missing from `resources/hapi-config/application.yaml`.

**The frontend build is killed.** Out of memory. Add swap (above) or use `make up-prod-pull`.

## Rehearsing the production stack locally

The overlay runs on a laptop with Docker Desktop, which is how it was verified. Use a separate project name so it does not collide with the development stack's containers and volumes, and a plain-HTTP address that both the browser and the containers can resolve:

```sh
EMR_PUBLIC_URL=http://host.docker.internal EMR_SSL_REQUIRED=none \
  docker compose -p nawi-prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
open http://host.docker.internal
docker compose -p nawi-prod -f docker-compose.yml -f docker-compose.prod.yml down -v   # afterwards
```

Caddy serves plain HTTP on :80 for an `http://` site address, Keycloak runs in production mode against that hostname, and the gateway reaches it back through the host. On Linux add `127.0.0.1 host.docker.internal` to `/etc/hosts` first, as for development.
