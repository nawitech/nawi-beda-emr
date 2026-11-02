---
name: beda-workflow
description: Create, extend, audit, or document questionnaire-driven clinical workflows in this Nawi Beda EMR repository. Use for Beda Questionnaire and Mapping seeds, FHIR transitions, questionnaire actions, clinical context, workflow queues, and gateway integration.
---

# Beda workflow

Implement clinical workflows using this repository's existing Beda EMR and FHIR conventions.

## Start with repository evidence

Before changing files:

1. Read `CLAUDE.md` if present.
2. Inspect the closest existing resources under `resources/fhir-seeds/Questionnaire/` and `resources/fhir-seeds/Mapping/`.
3. Inspect the target `ResourceListPage` or `ResourceDetailPage`, application routes, menu layout, gateway allowlist, Compose seed services, and relevant documentation.
4. Check the installed Beda version and use APIs supported by this checkout. Do not assume examples from a newer upstream version apply unchanged.
5. Preserve unrelated changes in the working tree.

If the requested workflow is not fully specified, infer only reversible implementation details. Ask before choosing a clinical state model, terminology, role ownership, or destructive migration when that choice materially changes behavior.

## Choose the smallest complete increment

Define:

- the actor and launch location;
- required launch context;
- data collected;
- FHIR resources created or updated;
- starting state, resulting state, and next owner;
- how the next stage discovers its work;
- authorization and gateway implications;
- whether any seed is reference data the application will edit afterwards (then it must be create-only; see [references/seeds.md](references/seeds.md)).

Prefer an end-to-end vertical slice over disconnected placeholders. Do not invent an encounter-based workflow if the application cannot supply encounter context; implement a clearly documented patient-scoped increment or add the missing encounter surface when requested.

## Implement

For Questionnaire/Mapping work, read [references/seeds.md](references/seeds.md).

For transitions, queues, or multi-stage workflows, also read [references/transitions.md](references/transitions.md).

For UI, gateway, documentation, and verification, read [references/integration.md](references/integration.md).

Before reusing anything from `contrib/fhir-emr`, or when an upstream Beda feature does not work, read [references/stack-compatibility.md](references/stack-compatibility.md). This deployment is HAPI, not Aidbox, and much of upstream assumes Aidbox.

Important invariants:

- Persist clinical and workflow state as FHIR resources, not React-only state.
- Use a transaction `Bundle` when form data and a transition must succeed or fail together.
- Keep Questionnaire linkIds, Mapping answer lookups, and clinical-context names exactly aligned.
- Use stable canonical URLs and coded concepts. Prefer standard LOINC, SNOMED CT, and UCUM codes when appropriate; identify local code systems explicitly.
- Link generated clinical resources to the available patient and encounter context.
- Enforce permissions outside the UI as well as hiding actions by role.
- Do not edit generated bundles when source seeds are available.
- Seeds are re-applied on every `docker compose up`. A seeded resource the UI edits at runtime (the price list today) must be in the `--create-only` list of the upload service in `docker-compose.yml`, or every restart reverts users' edits.
- Do not modify `contrib/fhir-emr` unless the custom application cannot provide the required extension point and the user accepts maintaining a submodule change.

## Validate and hand off

Run:

```sh
bash .claude/skills/beda-workflow/scripts/validate-workflow.sh
```

Then run the narrowest relevant project checks available, such as TypeScript checking or a seed build. Do not claim runtime extraction succeeded unless the SDC and FHIR services were actually exercised. When the workflow edits seeded resources, also prove the edit survives `docker compose up -d`.

Report:

- the implemented user flow and transition;
- resources and code systems created or updated;
- files changed;
- checks run and checks unavailable;
- remaining manual deployment, permissions, terminology, or clinical-review steps.

