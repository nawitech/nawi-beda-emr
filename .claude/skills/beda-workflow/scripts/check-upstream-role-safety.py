#!/usr/bin/env python3
"""Fail if src/ routes an upstream Beda container that cannot run on this app's roles.

Upstream's `contrib/fhir-emr/dist/utils/role.js` matches on `user.role[0].name` against an
option map containing only the four upstream roles (patient, admin, practitioner,
receptionist). This application defines eight (see src/utils/role.ts), so any Nawi role hits
`undefined` and is then invoked — a blank screen and `d(...) is not a function`.

Reaching role.js is a risk signal, not proof: `EMR` reaches it but works, because the app
passes its own `getAuthenticatedClinicalContext`. So this reports rather than guesses, and
only fails when such a container is actually imported by src/.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(subprocess.run(['git', 'rev-parse', '--show-toplevel'],
                                   capture_output=True, text=True, check=True).stdout.strip())
DIST = ROOT / 'contrib' / 'fhir-emr' / 'dist'
CONTAINERS = DIST / 'containers'
IMPORT = re.compile(r'from\s+"([^"]+)"')

# Containers known to reach role.js but proven to work, with the reason.
ALLOWED = {'EMR': 'app supplies getAuthenticatedClinicalContext, overriding the role path'}


def resolve(base: pathlib.Path, spec: str):
    if not spec.startswith('.'):
        return None
    p = (base.parent / spec).resolve()
    if p.is_file():
        return p
    for cand in (p.with_suffix('.js'), p / 'index.js'):
        if cand.is_file():
            return cand
    return None


def reaches_role(entry: pathlib.Path) -> bool:
    seen, stack = set(), [entry]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        if cur.name == 'role.js' and cur.parent.name == 'utils':
            return True
        try:
            src = cur.read_text()
        except OSError:
            continue
        for spec in IMPORT.findall(src):
            nxt = resolve(cur, spec)
            if nxt and nxt not in seen:
                stack.append(nxt)
    return False


def main() -> int:
    if not CONTAINERS.is_dir():
        print('Upstream role safety: skipped (contrib/fhir-emr/dist not built)', file=sys.stderr)
        return 0

    risky = {d.name for d in CONTAINERS.iterdir()
             if (d / 'index.js').is_file() and reaches_role(d / 'index.js')} - set(ALLOWED)

    imported = set()
    for path in (ROOT / 'src').rglob('*.ts*'):
        text = path.read_text()
        for block in re.findall(r'import\s*\{([^}]*)\}\s*from\s*[\'"]@beda\.software/emr/containers[\'"]', text):
            for name in block.split(','):
                name = name.strip().split(' as ')[0].strip()
                if name in risky:
                    imported.add((name, path.relative_to(ROOT)))

    if imported:
        print('Upstream role safety: FAILED', file=sys.stderr)
        for name, path in sorted(imported):
            print(f'  {path} imports {name}, which reaches upstream utils/role.js and will '
                  f'crash on any role outside patient/admin/practitioner/receptionist.',
                  file=sys.stderr)
        print('  Write a Nawi container using ResourceListPage and src/utils/role.ts instead.',
              file=sys.stderr)
        return 1

    print(f'Upstream role safety: valid ({len(risky)} risky upstream containers, none routed)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
