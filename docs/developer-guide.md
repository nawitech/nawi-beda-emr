# Nawi EMR developer guide

A working introduction for someone new to this repository. It assumes you can read TypeScript and YAML, and assumes nothing about FHIR, Beda EMR, or SDC.

Read §1–§3 once to get the mental model. After that the tutorials in §5 are the working reference, and §7 is the list of things that have already cost someone a day.

---

## 1. What this is

Nawi EMR is a clinical system for outpatient departments in private clinics. It is built on **Beda EMR**, an open-source React EMR, customised for a Kenyan OPD workflow: reception → triage → consultation → laboratory / pharmacy → billing.

The unusual thing about this codebase is how little of the clinical behaviour lives in the React application. **Forms and clinical logic are data, not code.** Adding "record a patient's vitals" is not a React component — it is two YAML files.

That is worth internalising early, because it inverts the usual instinct. When something clinical needs changing, the answer is almost always a seed file, not a component. §4.1 draws the line precisely: what is configuration, what we had to write, and why.

### The moving parts

```text
  browser ──► fhir-gateway ──► HAPI FHIR ──► Postgres
   :3000        :8084            :8082
      │                            ▲
      │                            │
      └──────► fhir-sdc ───────────┘
                :8083
              (renders forms, runs extraction)
```

| Service | What it does | Why you care |
| --- | --- | --- |
| **HAPI FHIR** | The clinical database. Stores everything as FHIR resources. | Where your data actually lands. Query it directly when debugging. |
| **fhir-gateway** | Auth proxy. Verifies the Keycloak token, enforces an allowlist. | A new resource type needs an allowlist entry or the app gets 403s. |
| **Keycloak** | Identity. Issues tokens carrying the user's role. | Roles and test users are seeded from one JSON file. |
| **fhir-sdc** | Structured Data Capture. Turns a filled form into FHIR resources. | Runs your *mappings*. When extraction misbehaves, read its logs. |
| **fhirpath_mapping** | Evaluates the FHIRPath templates inside mappings. | The engine whose limits shape how you write forms (§7). |
| **Vite** | Frontend dev server on :3000. | Hot-reloads; you rarely restart it. |

Locally the frontend is **Vite on :3000**, not the `beda-frontend` container — see `docs/frontend-image.md` for why.

### FHIR in one paragraph

FHIR models healthcare as **resources**: `Patient`, `Encounter` (a visit), `Observation` (a measurement), `Condition` (a diagnosis), `MedicationRequest` (a prescription), `Task` (a unit of work). Each has a type, an id, and a defined shape. You read and write them over HTTP: `GET /fhir/Patient/123`, `POST /fhir/Observation`. A **transaction Bundle** posts many resources at once, all-or-nothing — which is how every workflow in this repo writes its data.

---

## 2. The workflow pattern

Every clinical step in this system is the same four things. Learn this once and the rest is repetition.

```text
   ┌────────────┐   launches    ┌───────────────┐   submits to   ┌─────────┐
   │   Queue    │──────────────►│ Questionnaire │───────────────►│ Mapping │
   │ (React)    │               │    (YAML)     │                │ (YAML)  │
   └────────────┘               └───────────────┘                └────┬────┘
         ▲                                                            │
         │                     one transaction Bundle                 │
         └──────────────── Task ◄─────────────────────────────────────┘
                     (queued work item)
```

1. **A Questionnaire** defines the form — the questions, their types, what is required.
2. **A Mapping** defines what the answers become — which FHIR resources get written.
3. **A Task** is a unit of queued work. `Task.code` says which station (`triage`, `consultation`, `lab`, `pharmacy`); `Task.status` says whether it is waiting.
4. **A Queue** is a React page listing `ready` Tasks for one station, with a button that launches the form.

### The rule that makes it work

**The form's mapping completes its own Task and creates the next one, in the same transaction as the clinical data.**

A patient leaves the triage queue because a `Task` moved to `completed` in the database — never because the browser navigated somewhere. If the transaction fails, nothing moved: no observations, no state change. If it succeeds, all of it moved together.

This is why you will not find "workflow state" in React. There isn't any.

### A worked example

Triage submits one transaction containing:

```text
  POST   Observation  × 5–8      the vital signs
  PATCH  Task         triage       → completed
  PATCH  Encounter                 → triaged
  POST   Task         consultation → ready
```

Ten writes, one transaction. The clinician's queue fills because the last write happened.

---

## 3. FCE — the shorthand the seeds are written in

This trips up everyone once, so it gets its own section.

The YAML under `resources/fhir-seeds/Questionnaire/` is **not** FHIR. It is Beda's **FCE** (FHIR Custom Entities) shorthand — a friendlier dialect that a converter service (`questionnaire-fce-fhir-converter`) turns into real FHIR before upload.

### Why it exists

Real FHIR puts most questionnaire behaviour in **extensions**, which are verbose. Compare — FCE:

```yaml
  - linkId: national-id
    type: string
    text: National ID
    enableWhenExpression:
      language: text/fhirpath
      expression: "%resource.repeat(item).where(linkId='birth-date').answer.valueDate.exists()"
```

and the FHIR it becomes:

```json
{
  "linkId": "national-id",
  "type": "string",
  "text": "National ID",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
    "valueExpression": {
      "language": "text/fhirpath",
      "expression": "%resource.repeat(item).where(linkId='birth-date').answer.valueDate.exists()"
    }
  }]
}
```

You write the first. The converter produces the second.

### Which keys are FCE shorthand

These look like plain fields but become extensions:

| FCE key | Becomes | Purpose |
| --- | --- | --- |
| `enableWhenExpression` | `sdc-questionnaire-enableWhenExpression` | Show/hide by FHIRPath (§5.4) |
| `answerExpression` | `sdc-questionnaire-answerExpression` | Compute the options (§5.5) |
| `choiceColumn` | `sdc-questionnaire-choiceColumn` | How to display each option |
| `referenceResource` | `questionnaire-referenceResource` | Which resource types a reference may point at |
| `initialExpression` | `sdc-questionnaire-initialExpression` | Prefill by FHIRPath |
| `itemControl` | `questionnaire-itemControl` | Which widget to render |
| `hidden` | `questionnaire-hidden` | Present but not displayed |
| `mapping` | `questionnaire-mapper` | Which Mapping extracts this form |

Everything else — `linkId`, `type`, `text`, `required`, `repeats`, `item`, `answerOption`, `answerValueSet`, `enableWhen` — is core FHIR and passes through unchanged.

### The consequence that surprises people

**`Mapping` is not a real FHIR resource type.** HAPI has never heard of it:

```sh
curl http://localhost:8082/fhir/Mapping/opd-triage
# HAPI-0302: Unknown resource type 'Mapping'
```

The seed tooling runs with `--embed-mapping`, so your mapping is folded *into the Questionnaire* as the `questionnaire-mapper` extension and only the Questionnaire is uploaded. Two things follow:

- To confirm a mapping shipped, look inside the Questionnaire, not for a `Mapping` resource.
- Editing **either** file re-uploads the Questionnaire. The watcher logging `Updated Questionnaire/opd-triage` after you changed `Mapping/opd-triage.yaml` is correct, not a mislabel.

### Seeing what the converter produced

Whenever a form behaves oddly, look at what HAPI actually stored. This is the single most useful debugging command in the repo:

```sh
curl -s http://localhost:8082/fhir/Questionnaire/opd-triage | python3 -m json.tool | less
```

If an FCE key you wrote is missing from the output, it did not convert — check spelling and indentation first, and make sure the watcher actually re-uploaded (§7.1).

---

## 4. Where everything lives

```text
resources/fhir-seeds/
  Questionnaire/    the forms          ← most of your work
  Mapping/          the extraction     ← most of your work
  CodeSystem/       local code lists   (diagnoses, lab tests, formulary)
  ValueSet/         what a field offers
  ChargeItemDefinition/  the price list — one per billable code
resources/keycloak-seeds/     roles and test users
resources/gateway-config/     which FHIR queries the gateway permits
resources/hapi-config/        HAPI settings (incl. terminology indexing)
resources/caddy/              production edge proxy routing (docs/deployment.md)
scripts/                      backup.sh; upload-fhir-bundle.py, the seed upload with its create-only types (§7.0)
docker-compose.prod.yml       production overlay: no host ports, Caddy, hardened Keycloak

src/containers/
  OpdQueue/         the shared station queue — every queue is a wrapper
  TriageQueue/      ConsultationQueue/  LabQueue/  PharmacyQueue/
  App/routes.tsx    URL → component
  App/layout.tsx    which menu each role sees
src/utils/
  role.ts           the eight Nawi roles
  workflow.ts       canonical URLs for the OPD code systems
```

### 4.1 Configuration or code? Reach for configuration first

The most useful instinct in this codebase: **almost all clinical behaviour is configuration.** Before writing a component, check whether a seed file already does it.

Roughly, the split today:

| | Size | What it covers |
| --- | --- | --- |
| **Configuration** (YAML/JSON seeds) | ~2,500 lines, 20 seed files | All seven clinical workflows, every form, every catalogue, roles, permissions |
| **Custom code** (TypeScript) | ~610 lines, 9 components | Queues, four replaced Beda components, wiring |
| **Beda, unchanged** | the rest | Form rendering, extraction, tables, auth, search, layout |

Things people reliably assume need code, that do not:

| You want to… | Do it in | How |
| --- | --- | --- |
| Add a field, or a whole form | Questionnaire seed | §5.1 |
| Decide what a form writes to the database | Mapping seed | §5.1 |
| Show a field only in some cases | Questionnaire seed | `enableWhenExpression` — §5.4 |
| Limit a dropdown to this patient's data | Questionnaire seed | `answerExpression` — §5.5 |
| Add a diagnosis / test / drug list | CodeSystem + ValueSet seeds | §5.3 |
| Add a role, user, or token claim | `resources/keycloak-seeds/` | one JSON file |
| Permit a new FHIR query | `resources/gateway-config/` | §5.6 |
| Move a patient between stations | Mapping seed | Task writes — §2 |

Code is genuinely needed for three things: **a new page or queue**, **wiring** (routes and menus), and **replacing a Beda component that does not work here**.

### 4.2 What we had to write, and why

Every custom component exists for a stated reason. This matters for upgrades: the first group is permanent, the second and third could disappear if upstream changes, and a Beda submodule bump is the moment to re-check them.

**Beda has no equivalent — permanent.**

| Component | Lines | Why |
| --- | --- | --- |
| `OpdQueue` | 158 | Beda has no concept of a station work queue. This is the one genuinely new idea in the application. |
| `TriageQueue`, `ConsultationQueue`, `LabQueue`, `PharmacyQueue` | ~21 each | Thin wrappers. A station is a Task code, a title and a form. |

**Beda's equivalent crashes on Nawi roles — could disappear upstream.**

| Component | Lines | Why |
| --- | --- | --- |
| `EncounterResourceList` | 123 | Upstream `EncounterList` calls a role matcher that only knows four roles (§7.5). |
| `InvoiceResourceList` | 84 | Same, for `InvoiceList`. |
| `HealthcareServiceResourceList` | 73 | Same, for `HealthcareServiceList`. |
| `PriceListResourceList` | ~110 | Upstream has no price-list page at all. Lists `ChargeItemDefinition`s and launches `opd-price-edit`. |

All four are built on Beda's own `ResourceListPage`, so they are mostly column definitions rather than new machinery. If upstream ever makes its role matcher extensible, all three become deletable.

**Beda's equivalent has a defect — could disappear upstream.**

| Component | Lines | Why |
| --- | --- | --- |
| `CodeGrantAuth` | 87 | Upstream replays the OAuth code under React StrictMode, which revokes the session (§7.9). Ours guards the exchange. |

**Deployment-specific — small but permanent.**

| File | Why |
| --- | --- |
| `src/services/expand.ts` | Terminology expansion must point at *this* server; the catalogues are local (§7.6). |
| `src/utils/role.ts` | The eight Nawi roles. Upstream has four. |
| `src/utils/clinicalContext.ts` | Resolves the signed-in user through the Nawi role matcher. |
| `src/utils/workflow.ts` | Canonical URLs shared by the queues and the seeds. |
| `App/routes.tsx`, `App/layout.tsx` | Wiring. Always code. |

**Used from Beda unchanged** — worth knowing so you do not rebuild it: `ResourceListPage` and `ResourceDetailPage` (tables, filters, paging, row actions), the entire questionnaire renderer and SDC extraction pipeline, `InvoiceDetails` and `PractitionerList`, the patient detail page and dashboard, sign-in, layout and theming, and the FHIR helpers (`resolveReference`, `renderHumanName`, `formatHumanDateTime`, `getPersonAge`, `getResourceClinicalContext`).

**The rule of thumb.** If you are writing a React component to express something clinical — a field, a rule about when it appears, what it saves — stop; that belongs in a seed. Write code for a new surface, for wiring, or when a Beda component demonstrably does not work. And when you replace a Beda component, say why in a comment at the top, as the existing ones do: the next person needs to know whether it is still necessary.

The companion documents: `opd-implementation-plan.md` (what is built and what is next), `opd-triage-workflow.md` and `opd-consultation-workflow.md` (the shipped workflows in detail), `opd-terminology.md` (catalogues), `frontend-image.md` (Docker), `deployment.md` (running it on a server).

---

## 5. Tutorials

### 5.1 Add a field to an existing form

Say triage should record a pain score.

**Step 1 — add the question.** In `resources/fhir-seeds/Questionnaire/opd-triage.yaml`:

```yaml
  - linkId: pain-score
    type: integer
    text: Pain score (0–10)
    required: false
```

`linkId` is the field's permanent name. The mapping refers to it by this string, so choose carefully and do not rename it later without updating the mapping.

**Step 2 — turn it into clinical data.** In `resources/fhir-seeds/Mapping/opd-triage.yaml`, add to the `{% assign %}` block:

```yaml
    - painScore: "{{ %QuestionnaireResponse.answers('pain-score') }}"
```

then add a transaction entry. Because the field is optional, the entry must be conditional — an `Observation` with no value is invalid FHIR:

```yaml
    - "{% if %painScore.exists() %}":
        request:
          url: /Observation
          method: POST
        resource:
          resourceType: Observation
          status: final
          code:
            coding:
              - system: http://loinc.org
                code: "72514-3"
                display: Pain severity score
          subject:
            reference: "{{ %patientReference }}"
          encounter:
            reference: "{{ %encounterReference }}"
          effectiveDateTime: "{{ %recordedAt }}"
          valueInteger: "{{ %painScore }}"
```

Note the indentation: everything under a `{% if %}` sits one level deeper than an unconditional entry.

**Step 3 — check it uploaded.**

```sh
docker compose -f docker-compose.dev.yml logs --tail=5 watch-fhir-seeds
```

Wait for `Updated Questionnaire/opd-triage`. Do not skip this — see §7.1.

**Step 4 — test without the UI.** See §6.

### 5.2 Add a whole new station

Say the clinic adds a cashier step. A station is always the same five pieces.

1. **Decide the Task code.** `billing`. It goes in `Task.code` using the `opd-task` code system.

2. **Whoever hands off creates the Task.** In the mapping of the step *before* it, add a conditional-create entry. Key it on the visit key so a resubmitted form cannot enqueue twice:

```yaml
    - request:
        url: /Task
        method: POST
        ifNoneExist: "identifier=https://emr.nawi.ke/fhir/sid/opd-task|{{ %visitKey }}-billing"
      resource:
        resourceType: Task
        status: ready
        intent: order
        identifier:
          - system: https://emr.nawi.ke/fhir/sid/opd-task
            value: "{{ %visitKey }}-billing"
        code:
          coding:
            - system: https://emr.nawi.ke/fhir/CodeSystem/opd-task
              code: billing
        focus:
          reference: "{{ %encounterReference }}"
        "for":
          reference: "{{ %patientReference }}"
```

3. **Write the station's form** — a Questionnaire and a Mapping. Its mapping must complete `<visitKey>-billing` and do whatever comes next.

4. **Add the queue.** Eight lines, because `OpdQueue` does the work:

```tsx
export function BillingQueue() {
    return (
        <OpdQueue
            taskCode="billing"
            headerTitle={t`Billing queue`}
            questionnaireId="opd-billing"
            actionTitle={t`Take payment`}
            emptyReportTitle={t`Waiting for payment`}
        />
    );
}
```

5. **Route and menu it** in `src/containers/App/routes.tsx` and `src/containers/App/layout.tsx`.

**One queue can serve several stations.** `stations` is a list, and each row's action is chosen from its own Task code, so related work stays in one worklist. The clinician's queue does this — new consultations and post-laboratory reviews together:

```tsx
            stations={[
                { taskCode: 'consultation', questionnaireId: 'opd-consultation', actionTitle: t`Start consultation` },
                { taskCode: 'review', questionnaireId: 'opd-review', actionTitle: t`Review results` },
            ]}
```

Comma-separated tokens are an OR in FHIR search, so this is still one query.

Then check the gateway allowlist (§5.6) for any new resource types.

### 5.3 Add a catalogue

Anything the clinician picks from a list — diagnoses, lab tests, drugs — is a `CodeSystem` (the codes) plus a `ValueSet` (what a field offers).

Create `resources/fhir-seeds/CodeSystem/opd-referral-reason.yaml`:

```yaml
id: opd-referral-reason
resourceType: CodeSystem
url: https://emr.nawi.ke/fhir/CodeSystem/opd-referral-reason
status: active
content: complete
caseSensitive: true
concept:
  - code: specialist-opinion
    display: Specialist opinion
  - code: imaging
    display: Imaging not available on site
```

and the matching ValueSet including that system. Then bind a field to it **by canonical URL**:

```yaml
  - linkId: referral-reason
    type: choice
    text: Reason for referral
    answerValueSet: https://emr.nawi.ke/fhir/ValueSet/opd-referral-reason
```

**Always bind by `answerValueSet`, never inline the codes as `answerOption`.** That indirection is what lets a licensed catalogue replace a local one later without touching any form. See `docs/opd-terminology.md`.

New directory? The watcher will not see it until restarted — §7.1.

### 5.4 Conditional logic — show a field only sometimes

Two mechanisms, and picking the right one matters.

**`enableWhen`** — declarative, compares another answer in the same form. Use it whenever it is enough:

```yaml
  - linkId: pregnancy-test-result
    type: string
    text: Pregnancy test result
    enableWhen:
      - question: pregnancy-test-done
        operator: "="
        answerBoolean: true
```

**`enableWhenExpression`** — FHIRPath, for anything requiring computation or launch context:

```yaml
    enableWhenExpression:
      language: text/fhirpath
      expression: >-
        %resource.repeat(item).where(linkId='birth-date').answer.valueDate.exists() and
        %resource.repeat(item).where(linkId='birth-date').answer.valueDate <= today() - 18 years
```

`%resource` is the form being filled in. `%Patient`, `%Encounter` and `%Author` are the launch context.

Two rules:

- **It must return a boolean.** A FHIRPath comparison against an unanswered field returns *empty*, not false, and the renderer throws. Guard with `.exists() and …` — because `false and anything` is `false`, an unanswered field yields a clean `false`.
- **Do not combine `required: true` with a conditional.** See §7.4 — this one is a trap.

### 5.5 Constrain options to this patient

A dropdown does not have to be a static list. `answerExpression` can query the FHIR server, templated with launch context.

This is how the pharmacy form only offers prescriptions actually written for the visit in front of you:

```yaml
      - linkId: dispense-prescription-1
        type: reference
        text: Prescription
        referenceResource:
          - MedicationRequest
        answerExpression:
          language: application/x-fhir-query
          expression: "MedicationRequest?encounter={{ %Encounter.id }}&status=active"
        choiceColumn:
          - forDisplay: true
            path: "medicationCodeableConcept.coding.first().display"
```

- `type: reference` — the answer is a link to a real resource, not a code.
- `answerExpression` — a FHIR search. `{{ %Encounter.id }}` is substituted at runtime.
- `choiceColumn` — the FHIRPath for the text the user sees.

In the mapping, the answer is a **Reference**, so you get both halves:

```yaml
          authorizingPrescription:
            - "{{ %prescription1 }}"          # the whole Reference
          medicationCodeableConcept:
            text: "{{ %prescription1.display }}"
```

The same pattern constrains lab result entry to the tests actually ordered:
`ServiceRequest?encounter={{ %Encounter.id }}&status=active`.

**The trade-off.** A reference answer gives you a real link and a genuine constraint, but not a code. Here the `MedicationDispense` points at the `MedicationRequest`, which carries the coding — correct normalisation, but a report wanting the code must follow the link.

Add the queried resource type to the gateway allowlist, or the dropdown will be silently empty.

### 5.6 Let the gateway see a new resource type

Every FHIR call from the browser passes through `fhir-gateway`, which only permits paths in `resources/gateway-config/hapi_allowed_queries.json`. A missing entry is a rejection, not a FHIR error, so the symptom is usually "nothing loads".

Add two entries per resource type:

```json
{ "_comment": "Claim — GET by ID", "path": "Claim/ANY_VALUE",
  "queryParams": {}, "allowExtraParams": true, "allParamsRequired": false },
{ "_comment": "Claim — search", "path": "Claim",
  "queryParams": {}, "allowExtraParams": true, "allParamsRequired": false }
```

Then **restart the gateway** — the file is read once at startup:

```sh
docker compose -f docker-compose.dev.yml restart fhir-gateway
```

---

## 6. Testing without clicking through the UI

The fastest way to develop a mapping is to call extraction directly. It isolates your mapping from form rendering, login and clinical context.

The operation is `POST {sdcBackendUrl}/Questionnaire/$extract` — note there is no questionnaire id in the path, and it is **not** `/QuestionnaireResponse/$extract`, which 404s.

The body needs three kinds of entry:

```jsonc
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "Questionnaire", "resource": { /* GET Questionnaire/opd-triage */ } },
    { "name": "Patient",       "resource": { /* GET Patient/pat-1001 */ } },
    { "name": "Encounter",     "resource": { /* GET Encounter/... */ } },
    { "name": "Author",        "resource": { /* GET Practitioner/prac-1002 */ } },
    { "name": "questionnaire_response", "resource": {
        "resourceType": "QuestionnaireResponse",
        "questionnaire": "opd-triage",
        "status": "completed",
        "authored": "2026-09-15T09:15:00Z",
        "item": [ /* one entry per answered linkId */ ]
    }}
  ]
}
```

- **`Questionnaire` is required.** The service reads the embedded mapping from it. Omitting it fails with a 500 and an unhelpful `AttributeError` in the `fhir-sdc` log.
- One entry per launch-context variable, named exactly as the questionnaire declares it.
- The response is the `transaction-response`. Read each entry's `response.status`: `201` created, `200` matched an existing resource via `ifNoneExist`.

A 500 with an empty body means the endpoint exists and your payload is wrong. A 404 means your path is wrong.

Then check what landed:

```sh
curl -s "http://localhost:8082/fhir/Observation?encounter=Encounter/ID" | python3 -m json.tool
```

---

## 7. Caveats — the things that have already cost a day

### 7.0 Seeds are re-applied on every `up`; some are create-only

`upload-fhir-bundle` is a one-shot service and Compose re-runs it on every `docker compose up`, `PUT`ting every seed by id. That is right for questionnaires and terminology and wrong for data the application edits afterwards: the price list (`ChargeItemDefinition`) and the demo patient access `List` were being reset on every restart. `scripts/upload-fhir-bundle.py` now skips any resource whose type is in the service's `--create-only` list and whose id already exists (`ChargeItemDefinition` in `docker-compose.yml`; everything, `*`, for the demo bundle in `docker-compose.dev.yml`). Add a type there whenever a workflow seeds something the UI will edit. To reseed a create-only resource, delete it or `down -v`; the watcher's `PUT` on file change still works in development.

### 7.1 The seed watcher is a watcher, not a synchroniser

`watch-fhir-seeds` uploads on **change events only**. Three consequences:

- A **new directory** (adding `resources/fhir-seeds/ValueSet/` for the first time) is not watched until the container restarts. It only inotifies directories that existed at startup.
- A **new file** is not uploaded until it changes. After restarting the watcher, `touch` the new seeds.
- **It sometimes uploads a stale read.** This is the one that wastes hours. The watcher can fire on the filesystem event and read the file before your write has landed, so it logs a confident `Updated Questionnaire/opd-lab-results` having uploaded the *previous* content.

**The `Updated …` log line is not proof.** Verify what the server actually holds:

```sh
curl -s http://localhost:8082/fhir/Questionnaire/opd-lab-results \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['meta']['versionId'])"
```

If the change is missing, `touch` the file again — a second upload picks up the settled content. This cost two separate debugging sessions on this project, both spent suspecting the FCE converter of dropping extensions when the converter was innocent.

```sh
docker compose -f docker-compose.dev.yml restart watch-fhir-seeds
touch resources/fhir-seeds/ValueSet/*.yaml
docker compose -f docker-compose.dev.yml logs --tail=5 watch-fhir-seeds
```

A full `docker compose up` has none of these problems — `build-fhir-bundle` walks the whole tree.

#### Editing a Mapping strips its Questionnaire's `launchContext`

This is the deterministic sibling of the stale read above, and it is **not** a race — it
reproduces exactly, every time, with a bare `touch` and no concurrent write.

When a `Mapping/*.yaml` changes, the watcher re-pushes the **paired Questionnaire** to embed
the new mapping (`--embed-mapping`). That re-push does not run the resource back through the
FCE → FHIR converter, so every `sdc-questionnaire-launchContext` extension is dropped. The
`questionnaire-mapper` extension survives, because embedding it is the whole point of the
re-push.

Measured on `opd-billing`:

| Step | Action | Result |
| --- | --- | --- |
| 0 | baseline | `launchContext` × 3, `versionId` 9 |
| 1 | `touch` the **Questionnaire** | × 3, version **9** — no re-push; content was unchanged |
| 2 | `touch` the **Mapping** | **× 0**, version 10 — clobbered |
| 3 | `touch` the Questionnaire | × 3, version 11 — restored |

Step 1 also shows the watcher de-duplicates by content, which is why re-touching the
Questionnaire is the fix rather than a workaround.

**The symptom is delayed and misleading.** The questionnaire still lists, still opens, and
still renders every item. It fails only on submit, because `%Patient`, `%Encounter` and
`%Author` resolve to nothing — so the failure surfaces as a broken *mapping*, several steps
away from the edit that caused it. This is the real cause of the sessions that went looking
for a converter bug: the converter is innocent, but the embed path never calls it.

**So: edit the Mapping first and the Questionnaire last.** Editing a Questionnaire and then
its Mapping — the natural order — leaves the Questionnaire broken.

Check it directly rather than trusting the log line:

```sh
bash .claude/skills/beda-workflow/scripts/check-seeded-launch-context.sh          # report
bash .claude/skills/beda-workflow/scripts/check-seeded-launch-context.sh --fix    # re-touch
```

It diffs each seeded Questionnaire's `launchContext` count against its YAML and is wired into
`validate-workflow.sh`, so a normal validation run catches it.

### 7.2 Repeating groups: use `{[ ]}`, not `{{ }}`

The engine **does** iterate, and forms that capture a variable number of things should use repeating groups rather than fixed slots.

The trap is the capture syntax:

| Syntax | Returns |
| --- | --- |
| `{{ … }}` | a **single value** — a repeating answer collapses to the first, silently |
| `{[ … ]}` | a **collection** |

Mark the group `repeats: true` in the questionnaire, capture with `{[ ]}`, then loop. Full worked example in §5.1; the upstream reference is `contrib/fhir-emr/resources/init-seeds/Mapping/pre-visit-intake-medical-history-extract.yaml`.

**Key rows by content, not position.** With a repeating group, deleting a row shifts every later `%index`. An `%index`-keyed `ifNoneExist` will then create duplicates and orphan the originals on resubmit. Use something from the row — a code, a referenced id (`.reference.split('/').last()`).

**A cautionary note about this section.** It previously claimed the opposite — that the engine had no iteration — because a grep for `\{% *for[^%]*%\}` found nothing. `[^%]` cannot cross the `%` in `{% for index, row in %rxRows %}`. On the strength of that false negative, four forms were built with three fixed slots each, and a clinician could not prescribe a fourth drug. When a platform seems to lack something this basic, look for a working example before designing around the gap.

### 7.3 PATCH bodies must be `Parameters`

HAPI rejects a plain resource fragment with `HAPI-0537: Unable to determine PATCH body from request`. Write:

```yaml
    - request:
        method: PATCH
        url: "{{ %encounterReference }}"
      resource:
        resourceType: Parameters
        parameter:
          - name: operation
            part:
              - name: type
                valueCode: replace
              - name: path
                valueString: Encounter.status
              - name: value
                valueCode: in-progress
```

This matters when copying from upstream Beda: several upstream mappings use the plain form, which works on Aidbox and fails here. **Being `type: FHIRPath` is not enough to make an upstream mapping usable — check its PATCH entries too.**

Conditional PATCH does work, which is often better than adding a launch variable just to carry an id:

```yaml
        url: "Task?identifier=https://emr.nawi.ke/fhir/sid/opd-task|{{ %visitKey }}-triage"
```

### 7.4 A hidden `required` field still blocks submission

Beda builds its validation schema from the **whole** questionnaire, not from the enabled items. So `required: true` on a field hidden by `enableWhenExpression` makes the form permanently unsubmittable, with no visible field to explain why.

If a field is conditional, set `required: false` and enforce the rule elsewhere. `BaseQuestionnaireResponseForm` accepts a `customYupTests` prop, which is the clean path to genuinely conditional validation if you need it.

### 7.5 Most upstream Beda containers crash on Nawi roles

Upstream's `utils/role.js` matches `user.role[0].name` against four keys: `patient`, `admin`, `practitioner`, `receptionist`. Nawi has eight roles. Any other role resolves to `undefined`, which is then called:

```text
Uncaught TypeError: d(...) is not a function
    at s (role.js:13:5)
```

Twelve upstream containers reach that code. Nothing catches it early — exports resolve, TypeScript passes, the FHIR queries are valid. It fails only when a real user renders it.

Before routing an upstream container, run the guard (it is also in CI):

```sh
python3 .claude/skills/beda-workflow/scripts/check-upstream-role-safety.py
```

When one is unusable, write a Nawi container using `ResourceListPage` and this repo's `matchCurrentUserRole` — as `EncounterResourceList` and `InvoiceResourceList` do. Do not patch `contrib/fhir-emr`; it is a submodule.

### 7.6 Terminology needs indexing, and expansion must point here

Two independent things must both be true for a dropdown to populate:

- **HAPI must have fulltext search on.** `ValueSet/$expand` runs on the Hibernate Search index. Without it, `HSEARCH800001: Hibernate Search was not initialized`. Enabled in `resources/hapi-config/application.yaml`.
- **The frontend must expand against *this* server.** `src/services/expand.ts` once pointed at an external Australian terminology server inherited from a Beda demo. Local canonicals like `https://emr.nawi.ke/fhir/ValueSet/opd-diagnosis` exist nowhere else, so every local binding silently returned nothing.

Diagnosing an empty dropdown, in order:

```sh
# 1. Does the server know the concepts at all?
curl -s -G "http://localhost:8082/fhir/CodeSystem/\$lookup" \
  --data-urlencode "system=https://emr.nawi.ke/fhir/CodeSystem/opd-diagnosis" \
  --data-urlencode "code=malaria-confirmed"

# 2. Does expansion work?
curl -s "http://localhost:8082/fhir/ValueSet/opd-diagnosis/\$expand"
```

`$lookup` working while `$expand` returns zero means the concepts are stored but the index is not built. Rebuild it in place, then reset any ValueSet whose `$expand` response carries `FAILED_TO_EXPAND` in its `meta` extension:

```sh
curl -s -X POST "http://localhost:8082/fhir/\$reindex-terminology" -H 'Content-Type: application/fhir+json' -d '{"resourceType":"Parameters"}'
curl -s -X POST "http://localhost:8082/fhir/ValueSet/opd-diagnosis/\$invalidate-expansion"
```

Both are needed on any database seeded before 2026-10-27, when the fulltext block was added to the committed config. `docs/opd-terminology.md` has the full block, including the analyzer configurer line without which HAPI does not start.

### 7.7 Server-assigned ids, and why every workflow has a "visit key"

HAPI is configured with `server_id_strategy: UUID`, so you cannot choose a resource's id. A mapping therefore cannot say "the Task for encounter 123" by id.

Instead everything keys off a **business identifier** derived from the visit: `<patient-id>-<date>`, assigned to `Encounter.identifier` by `opd-start-visit`. Every downstream resource derives its identifier from it — `<visitKey>-triage`, `<visitKey>-rx-1`, `<visitKey>-lab`. Combined with `ifNoneExist`, that makes the whole visit idempotent: resubmit any form and it updates in place rather than duplicating.

Known limitation: one visit per patient per day. A genuine second attendance needs a real visit counter.

### 7.8 When a reference will not fit, the resource is usually wrong

The review note began as an `Observation` with `basedOn` pointing at the `DiagnosticReport` it responded to. HAPI rejected it:

```text
HAPI-0931: Invalid reference found at path 'Observation.basedOn'.
Resource type 'DiagnosticReport' is not valid for this path
```

R4 restricts `Observation.basedOn` to order-shaped resources, and `derivedFrom` does not accept `DiagnosticReport` either. The tempting move is to find any slot that takes `Reference(Any)` — `Observation.focus` would have been accepted — and carry on.

The better move was to notice that `ClinicalImpression` exists for exactly this: a clinician assessing something and concluding something. `supportingInfo` takes the report, `summary` the note, `code` the outcome. The mapping got simpler, not more clever.

FHIR's reference constraints are usually telling you something. When one refuses, check whether a more specific resource type is the real answer before forcing it through a permissive field.

### 7.9 React StrictMode and the OAuth code

Fixed, but worth knowing because the failure is so indirect. React 18 StrictMode double-invokes effects in development. Beda's `CodeGrantAuth` exchanged the authorization code with no guard, so the code was replayed, and Keycloak — correctly — revoked the session as an attack.

The symptom appeared **fifteen minutes later**: the access token expired, refresh failed with "Session doesn't have required client", and the user was logged out seemingly at random. `src/containers/CodeGrantAuth/index.tsx` now guards the exchange.

The lesson generalises: when a session or token misbehaves, correlate the Keycloak and gateway logs by timestamp before theorising.

```sh
docker compose -f docker-compose.dev.yml logs keycloak | grep -iE 'ERROR|WARN'
docker compose -f docker-compose.dev.yml logs fhir-gateway | grep -iE '401|403'
```

---

## 8. Before this touches real patients

Sprint-level status lives in `docs/opd-implementation-plan.md`. These are the standing ones.

**Authorization is not enforced.** The gateway checks *which patients* a user may touch, not *what they may do*. A pharmacist's token can write a diagnosis. Menu visibility is not security. `docs/opd-authorization.md` covers what is and is not checked, the permission matrix we need, and what implementing it involves.

**Catalogues are not clinically reviewed.** Diagnoses, lab tests and the formulary are all locally authored placeholders. Each needs sign-off. The formulary carries no strengths, forms, interactions or contraindications, and nothing checks allergies.

**No tests.** There is no automated test anywhere in `src/`. CI runs the role-safety guard, `typecheck` and `lint`.

**Watch for Aidbox-only features.** This deployment is HAPI. Reporting, provenance and file upload all use Aidbox-only operations and do not work. Do not build on them; record the gap.

**Verify in the browser.** Several bugs here passed typecheck, lint, export checks and live FHIR queries, and failed only on render. Static checks do not substitute for opening the page as the relevant role.

---

## 9. FAQ

**Where do I start when a form misbehaves?**
Look at what HAPI actually stored: `curl -s http://localhost:8082/fhir/Questionnaire/<id> | python3 -m json.tool`. Most surprises are an FCE key that did not convert, or the watcher not having re-uploaded.

**My field does not appear in the form.**
Check it converted (above). Check `enableWhen`/`enableWhenExpression` is not hiding it. Check the watcher log line.

**My dropdown is empty.**
Three candidates in order: the ValueSet does not expand (§7.6), the gateway is blocking the query (§5.6), or `answerExpression` returns nothing — try the search directly against HAPI.

**Extraction returns 500.**
Read `docker compose logs fhir-sdc`. Usually a missing launch-context variable or a mapping referencing a `linkId` that does not exist. A 500 on an empty body just means the payload was wrong.

**Submission succeeds but a resource is missing.**
Read the `transaction-response`. A conditional entry whose `{% if %}` was false is simply absent. A `200 OK` instead of `201 Created` means `ifNoneExist` matched something existing.

**Can I edit files under `contrib/fhir-emr`?**
No. It is a git submodule of upstream Beda. Write a Nawi component instead (§7.5).

**Do I need to restart anything after editing a seed?**
No — the watcher picks it up. But verify the change actually landed by reading the resource back; the `Updated …` log line can report a stale upload (§7.1). Restart is only needed for a **new directory** (§7.1), gateway config (§5.6), or HAPI config.

**How do I reset to a clean database?**
```sh
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```
This destroys all data. Seeds and the Keycloak realm are re-imported automatically.

**Which user do I log in as?**
Password `password` for all: `receptionist`, `triage-nurse`, `clinician`, `lab-technician`, `pharmacist`, `cashier`, `administrator`, `patient`. Each lands on its own queue.

---

## 10. Glossary

These docs lean on clinical and FHIR vocabulary. None of it is hard; it is just unfamiliar if you have not worked in health software.

### Clinical terms

**OPD** — Outpatient Department. Patients who come, are seen, and go home the same day. The opposite is inpatient, where they are admitted to a bed. This whole system is outpatient only.

**Triage** — the quick assessment before the doctor: vital signs, what brought you in, how urgent it is. From the French *trier*, to sort. Its job is ordering the queue, not diagnosing.

**Vitals / vital signs** — the standard body measurements: temperature, pulse, blood pressure, breathing rate, oxygen saturation, weight, height.

**Presenting complaint** (or *chief complaint*) — the patient's own reason for coming, in their words. "Fever and joint pain for two days." Not yet a diagnosis.

**Provisional vs confirmed diagnosis** — provisional is the working theory before evidence; confirmed is after it. A clinician may write "clinical malaria" provisionally and confirm it once the blood smear comes back. Both are kept: the record should show what was believed at the time.

**Formulary** — **the list of medicines this clinic stocks and its prescribers may prescribe.** Real pharmacies do not offer every drug in existence; they agree a list, which controls cost, keeps stock manageable, and stops clinicians prescribing something the pharmacy cannot dispense. Ours is `CodeSystem/opd-medication`, 25 generic drugs. A real formulary also carries strengths, forms, interactions and contraindications — ours carries none of that yet, which is why prescribing here has no safety checking.

**Specimen** — the physical sample taken for testing: blood, urine, stool, a swab.

**Dispense** — physically handing medicine to the patient. Distinct from *prescribe*, which is the clinician writing the order. Two different people, two different resources.

**MOH 705** — a Kenyan Ministry of Health return summarising diagnoses seen. A regulatory obligation, which is why it is the priority report.

**SHIF** — Social Health Insurance Fund, Kenya's national scheme. One of the payment methods a cashier can record.

### FHIR terms

**Resource** — one record of one type. A `Patient`, an `Observation`, an `Encounter`. FHIR's unit of everything.

**Encounter** — one visit. Reception opens it on arrival, billing closes it. Everything clinical that happens hangs off it.

**Observation** — any single measured or recorded finding: a temperature, a lab result, a clinical note. Deliberately broad.

**Condition** — a diagnosis or problem.

**ServiceRequest** — a request for something to be done. Here, a lab order.

**MedicationRequest / MedicationDispense** — the prescription, and the act of handing it over. Prescribing and dispensing are separate events by separate people, so they are separate resources.

**DiagnosticReport** — a set of results plus the interpreting clinician's conclusion. Groups the individual result Observations.

**ClinicalImpression** — a clinician's assessment and reasoning. Used here for the review after lab results return.

**Task** — a unit of work waiting for someone. The backbone of every queue in this system. `Task.code` says which station, `Task.status` says whether it is waiting, `businessStatus` carries our own stage label.

**ChargeItem / Invoice / PaymentReconciliation** — a billable line, the bill, and the record of payment.

**Bundle / transaction** — many resources posted together, all-or-nothing. Every workflow here writes one.

**CodeSystem / ValueSet** — a list of codes, and a selection from one or more such lists offered in a particular field. The indirection is what lets a licensed catalogue replace a local one without touching any form.

**Coding vs CodeableConcept** — a coding is one `system` + `code` + `display` triple. A CodeableConcept wraps one or more codings plus free text, for when the same idea has codes in several systems.

**LOINC / SNOMED CT / ICD-10 / UCUM** — standard code systems: LOINC for measurements and lab tests, SNOMED for clinical concepts, ICD-10 for diagnoses (especially on insurance claims), UCUM for units. Using standard codes is what lets data mean the same thing outside this deployment.

**Compartment** — everything attached to one patient. "Patient compartment" access control means "you may touch records belonging to these patients" — which is how our gateway works today (see `docs/opd-authorization.md`).

**Canonical URL** — the permanent identifier of a definition, like `https://emr.nawi.ke/fhir/ValueSet/opd-diagnosis`. Forms refer to definitions by canonical URL, not by database id, so the definition can be replaced underneath them.

**SDC** — Structured Data Capture, the FHIR specification for questionnaires and for turning answers into resources. `fhir-sdc` is the service implementing it; extraction is the turning-answers-into-resources half.
