# OPD triage workflow

Reception opens a visit; a triage nurse works the resulting queue, records a presenting complaint and vital signs against that visit's `Encounter`, and Beda SDC extracts the submission into standard FHIR `Observation` resources. The same transaction completes the triage work item, advances the encounter to `triaged`, and enqueues the consultation.

```text
reception          triage nurse                         clinician
  │                     │                                   │
  ├─ Start visit ──────►│                                   │
  │  Encounter arrived  ├─ Record triage ──────────────────►│
  │  Task triage ready  │  Encounter triaged                │  Task consultation ready
  │                     │  Task triage completed            │
```

## What is included

| File | Purpose |
| --- | --- |
| `resources/fhir-seeds/Questionnaire/opd-triage.yaml` | Defines the OPD triage form. |
| `resources/fhir-seeds/Mapping/opd-triage.yaml` | Converts the form response into a FHIR transaction containing the observations. |
| `resources/fhir-seeds/Questionnaire/opd-start-visit.yaml` | Reception form that opens the Encounter. |
| `resources/fhir-seeds/Mapping/opd-start-visit.yaml` | Creates the Encounter and the triage work item. |
| `src/containers/OpdQueue/index.tsx` | Shared station-queue component. |
| `src/containers/TriageQueue/index.tsx` | Triage nurse's queue; launches the triage form. |
| `src/containers/PatientResourceList/index.tsx` | Adds the **Start visit** action to every patient row. |
| `resources/gateway-config/hapi_allowed_queries.json` | Allows the frontend to read and search workflow tasks. |
| `src/containers/ConsultationQueue/index.tsx` | Clinician queue built on the Task this form creates. |
| `src/utils/workflow.ts` | Canonical URLs for the OPD code systems, shared by the queue and the seeds. |

Triage is now encounter-scoped. It must be launched from the triage queue, which supplies the `Encounter` and `Patient` launch context the mapping requires — launching it without an Encounter will fail extraction.

## Resulting data

A completed form creates five to eight `Observation` resources. Five are always written, because the workflow guide marks those vitals required:

1. Presenting complaint (`LOINC 8661-1`)
2. Temperature (`LOINC 8310-5`)
3. Heart rate (`LOINC 8867-4`)
4. Blood-pressure panel (`LOINC 85354-9`, systolic `8480-6` and diastolic `8462-4` as components)
5. Weight (`LOINC 29463-7`)

Three more are optional in the workflow guide, so their transaction entries are conditional on the question actually being answered. An unanswered question writes no resource rather than an `Observation` with an absent value:

6. Respiratory rate (`LOINC 9279-1`)
7. Oxygen saturation (`LOINC 2708-6`)
8. Height (`LOINC 8302-2`)

Every observation references the selected `Patient` and authenticated `Author`.

The final transaction entry creates this workflow state:

```text
Task.status         = ready
Task.intent         = order
Task.code           = consultation
Task.businessStatus = ready-for-consultation
Task.priority       = routine | urgent | stat
Task.for            = Patient/<selected-patient>
Task.focus          = Encounter/<visit>
Task.identifier     = https://emr.nawi.ke/fhir/sid/opd-task|<visit-key>-consultation
```

`Task.priority` comes straight from the form's **Queue priority** question. Its answer options are FHIR `request-priority` codes displayed as Routine, Urgent and Emergency, so the answer needs no translation on the way to the Task.

### Repeat submissions

The Task entry uses a conditional create:

```yaml
request:
  url: /Task
  method: POST
  ifNoneExist: "identifier=https://emr.nawi.ke/fhir/sid/opd-task|{{ %visitKey }}-consultation"
```

Resubmitting the form therefore returns the existing Task with `200 OK` instead of enqueueing a second work item.

Every key in the workflow derives from the **visit key** — the business identifier `Mapping/opd-start-visit` puts on the Encounter, currently `<patient-id>-<date>`. The Encounter, the triage Task and the consultation Task all key off it, so the whole visit is idempotent. The remaining limitation is one visit per patient per day; a patient who legitimately attends twice needs a real visit counter.

Observations are keyed the same way (`https://emr.nawi.ke/fhir/sid/opd-observation|<visit-key>-<vital>`), so a resubmitted form does not duplicate them either. Note what that means: a conditional create returns the existing resource and does **not** update it, so the first recorded value of each vital stands for the visit. Correcting a vital after submission is a separate edit, not a resubmission.

The transition is in the same transaction as the observations: either the complete triage submission and consultation task are accepted together, or none of them are persisted.

## Integration steps

### 1. Review the environment configuration

Create the local environment file if it does not already exist:

```sh
cp .env.tpl .env
```

Set the required database and Keycloak passwords described in the root `README.md`.

Also create the local frontend configuration if it is missing:

```sh
cp contrib/emr-config/config.local.js contrib/emr-config/config.js
```

Confirm that `sdcBackendUrl` points to the exposed FHIR SDC service and that the frontend FHIR base URL points to the gateway.

### 2. Start the development stack

```sh
make up-dev
```

The development Compose stack runs:

- HAPI FHIR
- FHIR SDC
- the FHIRPath mapping service
- `watch-fhir-seeds`, which watches `resources/fhir-seeds`

The watcher uploads `Questionnaire/opd-triage` automatically. Because the seed services run with `--embed-mapping`, editing *either* seed file re-uploads the questionnaire — the log line for a `Mapping/` change also reads `Updated Questionnaire/opd-triage`. Follow its logs:

```sh
docker compose -f docker-compose.dev.yml logs -f watch-fhir-seeds
```

For the production Compose stack, seeds are bundled and uploaded during startup. Rebuild the bundle services after changing seeds:

```sh
docker compose up --build build-fhir-bundle upload-fhir-bundle
```

### 3. Confirm that the resources loaded

Query HAPI directly in local development:

```sh
curl -s http://localhost:8082/fhir/Questionnaire/opd-triage
```

It should return a resource whose `id` is `opd-triage`. If it returns `404`, inspect the seed watcher or bundle uploader logs before testing the UI.

**There is no `Mapping` resource to fetch.** `Mapping` is an Aidbox resource type that HAPI does not know — `GET /fhir/Mapping/opd-triage` returns `HAPI-0302: Unknown resource type 'Mapping'`. The seed tooling embeds the mapping into the questionnaire instead, under the `questionnaire-mapper` extension. Confirm the mapping shipped by looking inside the questionnaire:

```sh
curl -s http://localhost:8082/fhir/Questionnaire/opd-triage \
  | python3 -c "import json,sys; print([e['url'] for e in json.load(sys.stdin).get('extension', [])])"
```

### 4. Install and start the frontend

```sh
yarn
yarn extract
yarn compile
yarn start
```

Open `http://localhost:3000`, select the local HAPI/Keycloak connection, and sign in as the seeded triage nurse:

```text
username: triage-nurse
password: password
```

### 5. Run the workflow

1. Sign in as `receptionist`, open **Patients**, find a patient, and select **Start visit** from the row actions. This creates the Encounter and puts the patient in the triage queue.
2. Sign out and sign in as `triage-nurse`.
3. Land on **Triage** — the patient should be waiting.
4. Select **Record triage** on their row.
5. Complete the required fields, choose a **Queue priority**, and submit. Leave respiratory rate, oxygen saturation or height blank to confirm that no Observation is written for them.
6. Confirm the patient leaves the triage queue.
7. Open the patient's detail page and check the new values in the **Resources** tab under Observations.
8. Sign out, sign in as `clinician`, and confirm the patient appears in **Consultations** with the priority the nurse chose.

The triage action works because the queue's `getClinicalContext` resolves both the `Patient` and the `Encounter` out of the row's bundle — they arrive there via `_include` — while the authenticated application context supplies `Author`. Those three names are referenced by the extraction mapping and are case-sensitive. Launching the same questionnaire from a surface that cannot supply `Encounter` will fail extraction.

### 6. Verify the extracted resources and transition directly

Use the patient's FHIR id from the browser URL or Patient response:

```sh
curl -s 'http://localhost:8082/fhir/Observation?subject=Patient/PATIENT_ID&_sort=-date'
curl -s 'http://localhost:8082/fhir/Task?patient=Patient/PATIENT_ID&status=ready&_sort=-authored-on'
```

Check that the returned observations contain:

- `status: final`
- `subject.reference: Patient/PATIENT_ID`
- a `performer` reference for the signed-in triage nurse
- the expected LOINC code
- the entered value and UCUM unit

The Task search should return a task containing:

- `status: ready`
- `code.coding.code: consultation`
- `businessStatus.coding.code: ready-for-consultation`
- `for.reference: Patient/PATIENT_ID`
- a `requester` reference for the triage author

## Troubleshooting

### The action opens but the form is not found

Verify that `Questionnaire/opd-triage` exists and is `active`. Then inspect `watch-fhir-seeds` and `fhir-sdc` logs.

### The form renders but submission fails

Inspect both services:

```sh
docker compose logs -f fhir-sdc fhirpath_mapping
```

The most common cause is missing clinical context. The mapping requires `%Patient`, `%Encounter`, `%Author`, and `%QuestionnaireResponse`.

### Submission succeeds but observations are absent

Inspect the `$extract` response in the browser network panel. It should be a `transaction-response` `Bundle` with eight to eleven entries: five to eight observations, the triage Task and Encounter patches, and the consultation Task. Then check the HAPI logs for transaction validation errors.

### The gateway rejects Observation or Task requests

The application writes through `fhir-gateway`, whose allowed queries and role rules are separate from the UI. The allowlist now contains Observation and Task routes, but role/access-checker rules may still need corresponding read/write permission for the triage nurse and clinician. Update those rules rather than bypassing the gateway.

## Exercising `$extract` without the UI

Useful when changing the mapping, because it isolates extraction from form rendering and clinical context. The operation is `POST {sdcBackendUrl}/Questionnaire/$extract` — note the path has no questionnaire id and is *not* `/QuestionnaireResponse/$extract`.

The `Parameters` body needs three kinds of entry: the `Questionnaire` itself (the service reads the embedded mapping from it, and omitting it fails with a 500), one entry per launch-context resource named exactly as the questionnaire declares it, and the response under the fixed name `questionnaire_response`.

```jsonc
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "Questionnaire", "resource": { /* GET Questionnaire/opd-triage */ } },
    { "name": "Patient",       "resource": { /* GET Patient/pat-1001 */ } },
    { "name": "Author",        "resource": { /* GET Practitioner/prac-1002 */ } },
    { "name": "questionnaire_response", "resource": {
        "resourceType": "QuestionnaireResponse",
        "questionnaire": "opd-triage",
        "status": "completed",
        "authored": "2026-09-09T09:15:00Z",
        "subject": { "reference": "Patient/pat-1001" },
        "item": [ /* one entry per answered linkId */ ]
    }}
  ]
}
```

```sh
curl -s -X POST 'http://localhost:8083/Questionnaire/$extract' \
  -H 'Content-Type: application/json' -d @extract.json
```

The service executes the transaction against HAPI and returns the `transaction-response`. Reading the per-entry `response.status` is the quickest way to confirm both conditional entries and the conditional create: a skipped optional vital simply has no entry, and a repeat submission shows `200 OK` against the *same* `Task/<id>` rather than a second `201 Created`.

## The consultation queue

`src/containers/ConsultationQueue/index.tsx` is the clinician's landing page. It is a `ResourceListPage<Task>` over the Task this form writes:

```text
GET /Task?code=https://emr.nawi.ke/fhir/CodeSystem/opd-task|consultation
        &status=ready
        &_include=Task:patient
        &_sort=authored-on
```

`_include=Task:patient` pulls each patient into the same bundle, so the name and age columns need no extra request per row. `getClinicalContext` resolves that patient back out of `record.bundle` and supplies it as `Patient` launch context — the seam the consultation questionnaire will plug into. Until that questionnaire exists the row action only opens the patient record.

Queue number and chief complaint are absent by design: the first lives on `Encounter.identifier` and the second is an `Observation` that a Task search cannot reach. Both arrive with the encounter-scoped increment.

## How the transition works

There is no frontend callback that creates the next state. `Mapping/opd-triage` returns one FHIR transaction containing the observations and a new Task. HAPI commits that transaction atomically.

The clinician queue selects the next work items from that Task — see [The consultation queue](#the-consultation-queue) above.

When the clinician finishes consultation, its own Questionnaire and Mapping must patch this Task to `completed` and create the next Task in the same transaction as the clinical writes, rather than changing state only in React.

## Scope boundaries and next increment

Delivered: reception opens a visit, triage runs against that Encounter, and both queues reflect persisted state.

Not yet built, in rough order:

1. **The consultation form.** The consultation queue is read-only until it exists — offering an action that cannot complete the Task would strand patients in the queue. It must complete `<visit-key>-consultation`, set `Encounter.status` to `in-progress`, and record a `Condition` bound to `ValueSet/opd-diagnosis` (see `docs/opd-terminology.md`).
2. **Queue number.** The workflow guide displays one to the patient and suggests `Encounter.identifier`. The visit key is a stable identifier but not a human-friendly sequence; a real per-day counter cannot be generated inside a FHIRPath mapping.
3. **Chief complaint in the consultation queue.** It is an `Observation` on the encounter, which a `Task` search cannot reach. It needs either a denormalised copy on the Task or a second query.
4. **More than one visit per patient per day.** The visit key is `<patient-id>-<date>`. Supporting a genuine second attendance needs a visit counter, which changes every downstream key.
5. **Encounter detail page.** Beda's `EncounterDetails` reaches upstream's role matcher, so it needs a Nawi container — see the plan's reuse inventory.

## Relevant Beda documentation

- [Custom EMR build](https://docs.emr.beda.software/Developers%20Guide/custom-emr-build/)
- [EMR component](https://docs.emr.beda.software/Developers%20Guide/emr-component/)
- [Clinical context](https://docs.emr.beda.software/Developers%20Guide/clinical-context/)
- [Resource detail page](https://docs.emr.beda.software/Developers%20Guide/resource-detail-page/)
- [Form Builder](https://docs.emr.beda.software/User%20Guide/Form%20Builder/)
