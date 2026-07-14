#!/usr/bin/env bash
# Reset the demo FHIR store to its seeded baseline.
#
# Removes everything written *on top of* the seeds — i.e. resources created by
# filling in forms (during a demo take, or by the Robot acceptance suite) — then
# re-uploads the seed bundles.
#
# Use between video takes and as Robot suite teardown.
#
#   ./scripts/reset-demo-data.sh
#
# HAPI refuses to delete a resource that others still reference, so children are
# deleted before their parents. Seeded resources have stable, human-readable ids
# (pt-denise-carroll, enc-harborview-ed, ...); form-created ones get server-assigned
# UUIDs. That distinction is what makes "keep the seeds, drop the rest" tractable.

set -euo pipefail

HAPI="${HAPI_BASE_URL:-http://localhost:8082/fhir}"
COMPOSE="docker compose -f docker-compose.dev.yml"

# A seeded id is one we authored: it is not a UUID.
is_uuid() { [[ "$1" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; }

# Child types first, then parents — HAPI enforces referential integrity on delete.
TYPES=(
  Observation Condition Immunization MedicationRequest MedicationDispense Task
  ServiceRequest Consent Procedure QuestionnaireResponse Provenance
  ClaimResponse Claim Encounter Patient
)

echo "Resetting demo data against ${HAPI}"

for t in "${TYPES[@]}"; do
  ids=$(curl -sf "${HAPI}/${t}?_count=1000&_elements=id" \
        | python3 -c 'import sys,json;b=json.load(sys.stdin);print("\n".join(e["resource"]["id"] for e in b.get("entry",[])))' \
        || true)
  removed=0
  for id in $ids; do
    if is_uuid "$id"; then
      if curl -sf -X DELETE "${HAPI}/${t}/${id}" -o /dev/null 2>/dev/null; then
        removed=$((removed + 1))
      fi
    fi
  done
  [ "$removed" -gt 0 ] && printf '  %-22s removed %s form-created\n' "$t" "$removed"
done

echo "Re-uploading seed bundles..."
$COMPOSE run --rm build-fhir-bundle       >/dev/null 2>&1
$COMPOSE run --rm build-fhir-bundle-demo  >/dev/null 2>&1
$COMPOSE run --rm upload-fhir-bundle      >/dev/null 2>&1
$COMPOSE run --rm upload-fhir-bundle-demo >/dev/null 2>&1

echo "Baseline:"
for t in Patient Encounter Questionnaire; do
  n=$(curl -sf "${HAPI}/${t}?_summary=count" | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')
  printf '  %-14s %s\n' "$t" "$n"
done
visits=$(curl -sf "${HAPI}/Encounter?status=finished&participant:missing=false&date=ge2026-06-15&date=le2026-07-14&_summary=count" \
         | python3 -c 'import sys,json;print(json.load(sys.stdin)["total"])')
echo "  report visits  ${visits}"
