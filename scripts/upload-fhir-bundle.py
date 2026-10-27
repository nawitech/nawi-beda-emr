#!/usr/bin/env python3
"""Upload a seed transaction Bundle to HAPI without clobbering runtime edits.

The Compose seed services run on every `docker compose up`, and the bundle fhirsnake exports
is all `PUT` by id. For questionnaires and terminology that is what we want: the checkout
is the source of truth and a changed seed must land. For resources the application edits at
runtime it is destructive: the price list (`ChargeItemDefinition`, edited on /price-list)
and the patient access `List` the gateway reads would be reset to the seed on every restart.

So this script takes the bundle, drops any `PUT` entry whose resource type is in
`--create-only` and whose id already exists on the server, and posts the rest. A create-only
resource is therefore seeded on an empty server and never touched again; delete it (or
`down -v`) to reseed it. `--create-only '*'` makes the whole bundle create-only, which is
right for demo identities.

Usage:
    upload-fhir-bundle.py --bundle fhirBundle.json --fhir-base http://hapi-fhir:8080/fhir \
        [--create-only ChargeItemDefinition,List | --create-only '*']

Standard library only, so it runs in a bare python:3-alpine container.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

HEADERS = {"Accept": "application/fhir+json", "Content-Type": "application/fhir+json"}


def exists(base, resource_type, resource_id):
    request = urllib.request.Request(f"{base}/{resource_type}/{resource_id}", headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status == 200
    except urllib.error.HTTPError as error:
        if error.code in (404, 410):
            return False
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle", required=True, help="transaction Bundle JSON produced by fhirsnake export")
    parser.add_argument("--fhir-base", required=True, help="FHIR base URL, e.g. http://hapi-fhir:8080/fhir")
    parser.add_argument(
        "--create-only",
        default="",
        help="comma-separated resource types to seed only when absent, or '*' for every type",
    )
    args = parser.parse_args()

    with open(args.bundle, encoding="utf-8") as handle:
        bundle = json.load(handle)

    create_only = {name.strip() for name in args.create_only.split(",") if name.strip()}
    every_type = "*" in create_only

    kept, left_alone = [], []
    for entry in bundle.get("entry", []):
        resource = entry.get("resource") or {}
        request = entry.get("request") or {}
        resource_type, resource_id = resource.get("resourceType"), resource.get("id")
        is_candidate = request.get("method") == "PUT" and resource_id and (every_type or resource_type in create_only)
        if is_candidate and exists(args.fhir_base, resource_type, resource_id):
            left_alone.append(f"{resource_type}/{resource_id}")
            continue
        kept.append(entry)

    if left_alone:
        print(f"left {len(left_alone)} existing create-only resource(s) untouched: {', '.join(left_alone[:5])}"
              + (" …" if len(left_alone) > 5 else ""))

    if not kept:
        print("nothing to upload")
        return 0

    bundle["entry"] = kept
    body = json.dumps(bundle).encode("utf-8")
    request = urllib.request.Request(args.fhir_base, data=body, method="POST", headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        print(f"upload failed: HTTP {error.code}", file=sys.stderr)
        print(error.read().decode("utf-8", "replace")[:4000], file=sys.stderr)
        return 1

    statuses = {}
    for entry in result.get("entry", []):
        status = (entry.get("response") or {}).get("status", "?").split(" ")[0]
        statuses[status] = statuses.get(status, 0) + 1
    summary = ", ".join(f"{count} x {status}" for status, count in sorted(statuses.items()))
    print(f"uploaded {len(kept)} entr{'y' if len(kept) == 1 else 'ies'}: {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
