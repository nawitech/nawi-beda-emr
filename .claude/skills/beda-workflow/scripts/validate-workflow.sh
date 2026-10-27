#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if command -v ruby >/dev/null 2>&1; then
    ruby -e "require 'yaml'; Dir['resources/fhir-seeds/**/*.yaml'].sort.each { |file| YAML.load_file(file) }; puts 'FHIR seed YAML: valid'"
else
    echo "FHIR seed YAML: skipped (Ruby is not installed)" >&2
fi

if command -v node >/dev/null 2>&1; then
    node -e "JSON.parse(require('fs').readFileSync('resources/gateway-config/hapi_allowed_queries.json')); console.log('Gateway JSON: valid')"
else
    echo "Gateway JSON: skipped (Node.js is not installed)" >&2
fi

git diff --check
echo "Git whitespace check: valid"

if command -v python3 >/dev/null 2>&1; then
    python3 .claude/skills/beda-workflow/scripts/check-upstream-role-safety.py
else
    echo "Upstream role safety: skipped (Python 3 is not installed)" >&2
fi

if [ -d node_modules ]; then
    yarn typecheck
else
    echo "TypeScript: skipped (node_modules is not installed)"
fi

bash "$(dirname "$0")/check-seeded-launch-context.sh" || true

echo "Static workflow validation complete. This does not verify live SDC extraction or FHIR persistence."
