#!/usr/bin/env bash
#
# Guards against a fhirsnake watcher bug in the dev loop.
#
# When a Mapping/*.yaml changes, the watcher re-pushes the PAIRED Questionnaire without
# running it back through the FCE -> FHIR converter, so every sdc-questionnaire-launchContext
# extension is silently dropped. The questionnaire keeps working in the list view and then
# fails on submit, because %Patient / %Encounter / %Author resolve to nothing.
#
# Editing the Questionnaire before its Mapping is therefore not enough: the Mapping write
# lands last and clobbers it. Touch the Questionnaire again afterwards — or just run this.
#
# Usage: check-seeded-launch-context.sh [--fix] [fhir-base-url]

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

fix=0
if [ "${1:-}" = "--fix" ]; then
    fix=1
    shift
fi
base="${1:-http://localhost:8082/fhir}"

if ! curl -sf -o /dev/null --max-time 5 "$base/metadata"; then
    echo "FHIR server not reachable at $base — skipping." >&2
    exit 0
fi

status=0
for file in resources/fhir-seeds/Questionnaire/*.yaml; do
    id="$(basename "$file" .yaml)"
    expected="$(node -e "
        const d = require('js-yaml').load(require('fs').readFileSync('$file', 'utf8'));
        console.log((d.launchContext || []).length);
    ")"
    [ "$expected" = "0" ] && continue

    actual="$(curl -s --max-time 10 "$base/Questionnaire/$id" | node -e "
        let s = '';
        process.stdin.on('data', (d) => (s += d)).on('end', () => {
            try {
                const q = JSON.parse(s);
                console.log((q.extension || []).filter((e) => /launchContext/.test(e.url)).length);
            } catch {
                console.log('missing');
            }
        });
    ")"

    if [ "$actual" != "$expected" ]; then
        echo "CLOBBERED $id: seeded $actual launchContext extension(s), YAML declares $expected"
        status=1
        if [ "$fix" = "1" ]; then
            touch "$file"
        fi
    fi
done

if [ "$status" = "0" ]; then
    echo "Seeded launchContext: all questionnaires match their YAML"
elif [ "$fix" = "1" ]; then
    echo "Re-touched the affected questionnaires; re-run in a few seconds to confirm."
fi

exit $status
