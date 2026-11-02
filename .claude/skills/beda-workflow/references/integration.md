# UI integration and verification

Read this reference when wiring actions, routes, queues, permissions, documentation, or tests.

## Select the launch surface

Use `questionnaireAction` on an existing `ResourceListPage` when the selected record supplies the required context. Use `ResourceDetailPage` for a record-centered workspace with tabs. Add a custom route only when the existing surfaces cannot express the user flow.

Check these files in this repository:

- `src/containers/App/routes.tsx`
- `src/containers/App/layout.tsx`
- the relevant container under `src/containers/`
- `resources/gateway-config/hapi_allowed_queries.json`
- `docker-compose.yml` and `docker-compose.dev.yml`

Keep menus and routes aligned. Ensure the action is available only to appropriate roles, while remembering that frontend role checks are not authorization. `getRecordActions` on `ResourceListPage` can vary per role: `PriceListResourceList` offers **Edit price** to administrators and nothing to cashiers, who see the same list read-only.

## Clinical context

Confirm context at each layer:

- authenticated context commonly supplies `Author`;
- a list row commonly supplies its primary resource;
- a detail page supplies its loaded primary resource;
- nested actions may require an explicit `getClinicalContext`;
- encounter actions often need both Encounter and Patient resources loaded.

Trace context from the actual installed Beda components when uncertain. A declared launch variable that is absent at runtime will break population or extraction.

## Gateway and backend

Add only the routes and search shapes the workflow needs. Consider reads, searches, writes, `$populate`, `$extract`, and transaction execution separately. The gateway allowlist and its access checker may impose different restrictions.

Queries that run during `$populate` (`x-fhir-query` variables, `itemPopulationContext`) execute inside `fhir-sdc` against HAPI directly and never meet the allowlist; queries the browser runs (`answerExpression`, `$expand`, every page search) do. fhir-sdc itself has no authorization. In production Caddy only forwards `/sdc` for a live Keycloak session, which is a gate on *who* may call it, not on *what* a populate query may read.

Source seeds are watched in development and bundled/uploaded in the Compose stack. Never rely on editing a generated `fhirBundle.json`; regenerate it from source seeds. The upload (`scripts/upload-fhir-bundle.py`) runs on every `up` and re-applies everything except the types it is told are create-only; a seed the UI edits belongs in that list.

## Documentation

Add or update one workflow guide that records:

- user flow;
- source files;
- generated FHIR data;
- state transition;
- seed deployment steps;
- UI test steps;
- direct FHIR verification queries;
- gateway/permission considerations;
- known scope boundaries and the next increment.

Keep command examples consistent with the repository's Makefile and Compose files.

### Document every local substitution

Standing project requirement. Wherever the implementation substitutes something local or simplified for the real thing — an unlicensed terminology replaced by local codes, a deferred integration, a capability the backend does not support — the guide must record both the substitution and how to undo it. A reader must be able to swap the component without reverse-engineering the seeds.

Give each one a named block covering:

- **What is local**, and why (licensing, no source catalogue, deferred integration, backend limitation).
- **The seam** — the exact file, canonical URL, or config key a replacement plugs into.
- **The swap procedure**, as concrete numbered steps.
- **What does not need to change**, so the blast radius is bounded.

Design for that seam while building, not afterwards. For terminology specifically: reference catalogues from questionnaires by `answerValueSet` canonical URL only, never inlined `answerOption`, so replacing a CodeSystem is a seed change and touches nothing else.

## Exercising `$extract` directly

The fastest way to test a mapping is to call the SDC service without the UI, which isolates extraction from form rendering and clinical context.

The operation is `POST {sdcBackendUrl}/Questionnaire/$extract`. Note the path: no questionnaire id, and **not** `/QuestionnaireResponse/$extract`, which 404s. The sibling operations are `POST /Questionnaire/$populate` and `POST /QuestionnaireResponse/$constraint-check`.

The `Parameters` body needs three kinds of entry:

- `Questionnaire` — the questionnaire resource itself. The service reads the embedded mapping from it; omitting it fails with a 500 and `AttributeError: 'NoneType' object has no attribute 'get'` in the `fhir-sdc` log.
- one entry per launch-context resource, named exactly as the questionnaire declares it (`Patient`, `Author`, `Encounter`, …).
- `questionnaire_response` — the fixed name for the response resource.

```sh
curl -s -X POST 'http://localhost:8083/Questionnaire/$extract' \
  -H 'Content-Type: application/json' -d @extract.json
```

The service executes the transaction against the FHIR server and returns the `transaction-response` bundle. Reading the per-entry `response.status` is the quickest way to prove conditional behaviour: a skipped conditional entry is simply absent, and a working conditional create returns `200 OK` against the *same* id on resubmission rather than a second `201 Created`.

A 500 with an empty request body means the endpoint exists and the payload is wrong; a 404 means the path is wrong.

## Verification ladder

Run the strongest available checks without overstating them:

1. Parse YAML and JSON.
2. Run `git diff --check`.
3. Run TypeScript/lint checks when dependencies are installed.
4. Build seeds with the repository's actual seed tooling.
5. Confirm Questionnaire and Mapping resources exist on the FHIR server.
6. Populate and render the form with real launch context.
7. Submit through `$extract` and inspect the returned transaction Bundle.
8. Confirm created/updated resources with direct FHIR searches.
9. Confirm the next-role queue returns the transitioned item.
10. Test unauthorized access and repeat submission when relevant.
11. When the workflow edits seeded resources, edit one, run `docker compose up -d` again, and confirm the edit survived.

Clearly distinguish static validation, seed-building validation, and live end-to-end validation.

