#!/usr/bin/env sh
#
# Dump both Postgres databases (HAPI clinical data, Keycloak identities) to compressed
# pg_dump archives. Run from anywhere; output lands in ./backups by default.
#
#   sh scripts/backup.sh                 # -> backups/hapi-<stamp>.dump, keycloak-<stamp>.dump
#   sh scripts/backup.sh /mnt/backups    # another directory
#   COMPOSE_FILES="-f docker-compose.dev.yml" sh scripts/backup.sh   # against the dev stack
#
# Restore (stack running, into an EMPTY database — drop the volume first for a full
# restore, see docs/deployment.md):
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres-hapi \
#     pg_restore -U hapi -d hapi --clean --if-exists < backups/hapi-<stamp>.dump
#
# Copy the archives off the machine; a backup on the same disk as the database is not one.

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMPOSE_FILES="${COMPOSE_FILES:--f docker-compose.yml -f docker-compose.prod.yml}"

cd "$ROOT_DIR"
mkdir -p "$OUT_DIR"

# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T postgres-hapi pg_dump -U hapi -Fc hapi > "$OUT_DIR/hapi-$STAMP.dump"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T postgres-keycloak pg_dump -U keycloak -Fc keycloak > "$OUT_DIR/keycloak-$STAMP.dump"

ls -lh "$OUT_DIR/hapi-$STAMP.dump" "$OUT_DIR/keycloak-$STAMP.dump"
