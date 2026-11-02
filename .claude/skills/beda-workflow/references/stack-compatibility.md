# Stack compatibility and reuse

Read this before copying anything from `contrib/fhir-emr`, and before assuming an upstream Beda feature works here.

## This deployment is HAPI, not Aidbox

**V1 targets HAPI, and V1 scope is what HAPI supports.** Do not work around a missing capability with Aidbox-shaped machinery. When a Beda or OHS feature does not work here, record it as a documented gap naming the component that would provide it, so the decision stays revisitable. See the documentation requirement in [integration.md](integration.md).

Upstream Beda EMR targets Aidbox. This repository runs **HAPI FHIR + `bedasoftware/fhir-sdc` + `bedasoftware/fhirpath-extract`** behind `fhir-gateway` (see `docker-compose.yml`). A large share of upstream assets assume Aidbox-only behaviour and fail here — usually at runtime, not at build time.

Verify against the checkout rather than upstream docs. The findings below were confirmed by inspection of `contrib/fhir-emr` and are worth re-checking after a submodule bump.

### Aidbox-only constructs that will not run

| Construct | Where it appears | HAPI equivalent |
| --- | --- | --- |
| Mapping `type: JUTE` (`$let`, `$fn`, `$body`) | 18 of 44 upstream mappings | Rewrite as `type: FHIRPath` — the only engine wired to `fhirpath_mapping`. |
| `_assoc` search parameter | ~11 upstream questionnaires, inside `answerExpression` | `_include` |
| `_createdAt` sort | `containers/Prescriptions` | `_lastUpdated` |
| `$query`, `$run` | `uberComponents/ViewChart/hooks.js`, `hooks/useViewDefinitionRows.js`, `services/provenance.js` | None. ViewDefinition reporting and the provenance/audit UI do not work on HAPI. |
| `$generate-upload-url`, `$generate-download-url` | `services/file-upload.js` | None. DocumentReference attachments need separate storage. |

### Terminology `$expand` needs fulltext search switched on

`answerValueSet` autocomplete calls `ValueSet/$expand`. On a default HAPI config that fails with `HSEARCH800001: Hibernate Search was not initialized`, because expansion runs on the Hibernate Search index. `resources/hapi-config/application.yaml` enables it — `hapi.fhir.fulltext_search_enabled: true` plus the `hibernate.search.*` block, **including** `hibernate.search.backend.analysis.configurer: ca.uhn.fhir.jpa.search.HapiHSearchAnalysisConfigurers$HapiLuceneAnalysisConfigurer`. Without the configurer HAPI crash-loops on `HSEARCH000353: Unknown analyzer`. Do not remove those lines without checking what breaks.

That block was missing from the committed file until 2026-10-27 even though the docs described it, so any database seeded before then holds concepts that were never indexed and ValueSets whose scheduled pre-expansion is recorded as `FAILED_TO_EXPAND`. Recovery, with no volume recreation:

```sh
curl -s -X POST http://localhost:8082/fhir/\$reindex-terminology -H 'Content-Type: application/fhir+json' -d '{"resourceType":"Parameters"}'
curl -s -X POST http://localhost:8082/fhir/ValueSet/opd-diagnosis/\$invalidate-expansion   # per FAILED ValueSet
```

`$reindex-terminology` rebuilds the Lucene index from the terminology tables and takes seconds at this size; `$expand` (with and without `filter`) works immediately afterwards, and the scheduled pre-expansion picks the ValueSets up later.

Two symptoms that look like a broken ValueSet but are not:

- **`$lookup` succeeds while `$expand` returns zero concepts.** The concepts are stored; the index is not built. `$lookup` is the quick way to tell "terminology missing" apart from "index missing". Reindex as above.
- **`FAILED_TO_EXPAND` in the expansion message.** HAPI pre-expands ValueSets on a schedule and persists the outcome, including a failure, and does not retry on its own. `$invalidate-expansion` resets it. The response's `meta.extension` (`valueset-expansion-message`) names the state.

### Seeds do not auto-sync in development

`watch-fhir-seeds` is a watcher, not a synchroniser. It uploads on change events only, so:

- A **new resource-type directory** (e.g. adding `resources/fhir-seeds/ValueSet/`) is not watched until the container restarts — it only inotifies directories that existed at startup.
- A **new file** is not uploaded until it changes. After restarting the watcher, `touch` the new seeds.

- It can **upload a stale read** — firing on the filesystem event before the write has landed, then logging a confident `Updated …` for the previous content.

**Never trust the `Updated …` line as proof.** Read back what the server holds before concluding anything about a seed:

```sh
curl -s http://localhost:8082/fhir/Questionnaire/<id> | python3 -m json.tool
```

If an expected element is missing, `touch` again before suspecting the seed or the FCE converter. A missing extension is far more often a stale upload than a conversion failure.

The bundle path has none of these limitations: `build-fhir-bundle` walks the tree at build time, so a full `docker compose up` picks up everything.

### The bundle is re-applied on every `up`, so some seeds are create-only

`upload-fhir-bundle` is a one-shot service, and Compose re-runs one-shots on every `docker compose up`. The exported bundle is `PUT` by id throughout, so left alone every start resets every seeded resource to the checkout. For questionnaires and terminology that is the point. For resources the application edits at runtime it is data loss: the price list (`ChargeItemDefinition`, edited on `/price-list`) and the demo patient access `List` (which `patient-create` PATCHes, and which the gateway reads) were both reverted on every restart until 2026-10-27.

`scripts/upload-fhir-bundle.py` now does the upload. Types named in its `--create-only` argument are uploaded only when that id is absent on the server: `ChargeItemDefinition` for the main bundle in `docker-compose.yml`, `*` for the demo bundles in `docker-compose.dev.yml` and `docker-compose.prod.yml`. A workflow that introduces a seed the UI will edit must add its type there and say so in its guide. To reseed a create-only resource, delete it (or `down -v`); in development the watcher still `PUT`s on file change, which is the deliberate "I edited the seed" path.

HAPI offers no shortcut: `ifNoneMatch: "*"` on a transaction `PUT` is ignored (verified on v8.10 — it updated anyway), and a conditional `POST` with `ifNoneExist` would surrender the stable ids the docs and the watcher rely on.

`$expand` is otherwise supported by HAPI, so `answerValueSet` autocomplete works once the ValueSet and CodeSystem are seeded and indexed.

### Upstream containers crash on this app's roles

The single most expensive trap here. `contrib/fhir-emr/dist/utils/role.js` matches on `user.role[0].name` against an option map with exactly four keys — `patient`, `admin`, `practitioner`, `receptionist`. This application defines eight roles in `src/utils/role.ts`. A Nawi role such as `clinician` resolves to `undefined`, which is then called, giving a blank screen and:

```text
Uncaught TypeError: d(...) is not a function
    at s (role.js:13:5)
```

Nothing catches this earlier: the container's exports resolve, TypeScript passes, the FHIR queries are valid, and the module transforms. It only fails when a real user with a real role renders it.

So **routing an upstream container is not free.** Before wiring one, check whether it can reach `utils/role.js`:

```sh
python3 .claude/skills/beda-workflow/scripts/check-upstream-role-safety.py
```

That script is part of `validate-workflow.sh` and CI. It walks the compiled import graph, and fails only when `src/` actually imports a container that reaches the role matcher.

Reaching `role.js` is a risk signal rather than proof — `EMR` reaches it and works, because this app passes its own `getAuthenticatedClinicalContext`. Treat a flagged container as guilty until you have rendered it as a Nawi role.

When one is unusable, write a Nawi container with `ResourceListPage` and this repo's `matchCurrentUserRole`, as `EncounterResourceList`, `InvoiceResourceList` and `HealthcareServiceResourceList` do. Do not patch `contrib/fhir-emr`.

### `Mapping` is not a resource type on HAPI

`GET /fhir/Mapping/<id>` returns `HAPI-0302: Unknown resource type 'Mapping'`. `Mapping` is an Aidbox type. The seed services run with `--embed-mapping`, so fhirsnake folds the mapping into the Questionnaire under the `https://emr-core.beda.software/StructureDefinition/questionnaire-mapper` extension and uploads only the Questionnaire.

Two consequences:

- Verify a mapping shipped by inspecting the questionnaire's `extension`, never by fetching `Mapping/<id>`.
- Editing *either* seed file re-uploads the questionnaire. In `watch-fhir-seeds` logs, a change to `Mapping/foo.yaml` also logs `Updated Questionnaire/foo` — that is correct, not a mislabelled write.

### Before authoring a new seed, check upstream

`contrib/fhir-emr/resources/init-seeds` holds ~82 Questionnaires and ~44 Mappings that are **not** loaded into this deployment — compose only bundles `resources/fhir-seeds`. Adapting one is usually cheaper than writing from scratch.

Triage a candidate in this order:

```sh
grep -m1 '^type:' contrib/fhir-emr/resources/init-seeds/Mapping/<id>.yaml   # must be FHIRPath
grep -n '_assoc\|_createdAt' contrib/fhir-emr/resources/init-seeds/Questionnaire/<id>.yaml
```

Then read it — several upstream forms are clinically region-specific (for example `place-order` models AU pathology/radiology, and `place-referral` creates an Appointment rather than a ServiceRequest). Reuse the mechanics, not the clinical content.

Copy adapted seeds into `resources/fhir-seeds`; do not load `init-seeds` wholesale.

## Gateway access model

`ACCESS_CHECKER=list`. Each JWT carries a `patient_list` claim naming a FHIR `List`, and the gateway grants access to the patient compartment of the patients that List contains.

Consequences to design around:

- **A newly created Patient is invisible until it is added to that List.** Any registration workflow must maintain the List, ideally in the same transaction that creates the Patient.
- A user without a `patient_list` attribute cannot use the gateway at all. Check `resources/keycloak-seeds/beda-emr-realm.json` when a role appears broken.
- `hapi_allowed_queries.json` is a **path** allowlist, not authorization. Most entries use `allowExtraParams: true` with `allParamsRequired: false`, so any authenticated user may run any search shape on an allowed resource type. Role-based write restrictions have no enforcement point in this configuration.

Adding a resource type to a workflow means adding both its `ANY_VALUE` read entry and its search entry to the allowlist. Missing entries surface as gateway rejections, not as FHIR errors.

## Modelling notes specific to this stack

- `Encounter.class` is bound to HL7 `ActEncounterCode` (`AMB`, `EMER`, `IMP`, …). It means *kind of visit*. Do not repurpose it as a "current station" pointer — put station in `Task.code`.
- `Encounter.status` in R4 does include `triaged`, so `planned → arrived → triaged → in-progress → finished` is a valid lifecycle.
- HAPI is configured with `server_id_strategy: UUID` (`resources/hapi-config/application.yaml`), so seeds cannot rely on client-assigned ids for resources they create. Use business identifiers for idempotency.
- HAPI's FHIRPath `PATCH` needs an indexed path to reach into nested arrays. For a small resource (`opd-price-edit` on `ChargeItemDefinition.propertyGroup.priceComponent`) a full `PUT` rebuilt from the launched resource is simpler and easier to verify; keep `PATCH` for list appends such as `patient-create`'s `List` entry.
- `$populate` queries run in `fhir-sdc` against HAPI directly; with the pinned `fhir-sdc:2.1.0a3` every `x-fhir-query` must end in `&_format=json` (see [seeds.md](seeds.md) §Two engines).
