# Overview

What Nawi EMR is, the concepts it is built from, and how they relate. Self-contained: it
assumes you can read TypeScript and YAML, and assumes nothing about FHIR, Beda EMR or SDC.

---

## 1. What this is

Nawi EMR is a clinical system for outpatient departments (OPD) in Kenyan private clinics.
It is built on **Beda EMR**, an open-source React EMR, over a **HAPI FHIR** backend. The
visit runs through seven stations:

```text
reception → triage → consultation → laboratory / pharmacy → review → billing
```

All seven are delivered and verified end to end, closing the visit at
`Encounter.status = finished`. What remains is hardening — above all authorization (§7).

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
| **HAPI FHIR** | The clinical database. Everything is a FHIR resource. | Where your data actually lands. Query it directly when debugging. |
| **fhir-gateway** | Auth proxy. Validates the Keycloak token, enforces a path allowlist. | A new resource type needs an allowlist entry or the app 403s. |
| **Keycloak** | Identity. Issues tokens carrying the user's role. | Roles and test users are seeded from one JSON file. |
| **fhir-sdc** | Structured Data Capture. Turns a filled form into FHIR resources. | Runs your *mappings*. When extraction misbehaves, read its logs. |
| **fhirpath_mapping** | Evaluates the FHIRPath templates inside mappings. | The engine whose limits shape how forms are written (§8). |
| **Vite** | Frontend dev server on :3000. | Local dev never uses the `beda-frontend` container. |

In production the ports above are not published. Caddy sits in front on 443 and routes
`/fhir`, `/kc` and `/sdc` to the gateway, Keycloak and fhir-sdc under one public URL, and
refuses any `/sdc` request without a valid token — fhir-sdc has no auth of its own. The
overlay is `docker-compose.prod.yml`; the guide is `docs/deployment.md`.

### FHIR in one paragraph

FHIR models healthcare as **resources**: `Patient`, `Encounter` (a visit), `Observation`
(a measurement), `Condition` (a diagnosis), `MedicationRequest` (a prescription), `Task`
(a unit of work). Each has a type, an id and a defined shape, read and written over HTTP
(`GET /fhir/Patient/123`, `POST /fhir/Observation`). A **transaction Bundle** posts many
resources at once, all-or-nothing — which is how every workflow here writes its data.

---

## 2. The central idea: clinical behaviour is configuration

Very little clinical behaviour lives in the React application. **Forms and clinical logic
are data, not code.** Adding "record a patient's vitals" is not a component — it is two
YAML files.

| | Size | What it covers |
| --- | --- | --- |
| **Configuration** (YAML/JSON seeds) | ~2,500 lines, 20 seed files | All seven clinical workflows, every form, every catalogue, roles, permissions |
| **Custom code** (TypeScript) | ~610 lines, 9 components | Queues, four replaced Beda components, wiring |
| **Beda, unchanged** | the rest | Form rendering, extraction, tables, auth, search, layout |

Things that reliably look like they need code, and do not:

| You want to… | Do it in |
| --- | --- |
| Add a field, or a whole form | Questionnaire seed |
| Decide what a form writes to the database | Mapping seed |
| Show a field only in some cases | Questionnaire seed — `enableWhen` / `enableWhenExpression` |
| Limit a dropdown to this patient's data | Questionnaire seed — `answerExpression` |
| Add a diagnosis / test / drug list | CodeSystem + ValueSet seeds |
| Add a role, user or token claim | `resources/keycloak-seeds/` |
| Permit a new FHIR query | `resources/gateway-config/` |
| Move a patient between stations | Mapping seed — the Task writes |

Code is genuinely needed for three things: **a new page or queue**, **wiring** (routes and
menus), and **replacing a Beda component that does not work here**. The rule of thumb: if
you are writing a React component to express something clinical — a field, a rule about
when it appears, what it saves — that belongs in a seed.

### Where things live

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

src/containers/
  OpdQueue/         the shared station queue — every queue is a wrapper
  TriageQueue/      ConsultationQueue/  LabQueue/  PharmacyQueue/
  App/routes.tsx    URL → component
  App/layout.tsx    which menu each role sees
src/utils/
  role.ts           the eight Nawi roles
  workflow.ts       canonical URLs for the OPD code systems
```

### What had to be written, and why

Every custom component exists for a stated reason, which matters at upgrade time:

- **No Beda equivalent — permanent.** `OpdQueue` (158 lines) is the one genuinely new idea
  in the application; Beda has no concept of a station work queue. `TriageQueue`,
  `ConsultationQueue`, `LabQueue`, `PharmacyQueue` are ~21-line wrappers around it.
- **Beda's equivalent crashes on Nawi roles — could disappear upstream.**
  `EncounterResourceList`, `InvoiceResourceList`, `HealthcareServiceResourceList` (§8).
- **Beda's equivalent has a defect.** `CodeGrantAuth` — upstream replays the OAuth code
  under React StrictMode, which revokes the session; ours guards the exchange.
- **Deployment-specific.** `services/expand.ts` (terminology must expand against *this*
  server), `utils/role.ts` (eight roles, upstream has four), `utils/clinicalContext.ts`,
  `utils/workflow.ts`, and the routes/layout wiring.

Used from Beda unchanged, so do not rebuild it: `ResourceListPage` and
`ResourceDetailPage` (tables, filters, paging, row actions), the entire questionnaire
renderer and SDC extraction pipeline, `InvoiceDetails`, `PractitionerList`, the patient
detail page, sign-in, layout and theming, and the FHIR helpers.

---

## 3. The workflow pattern — four pieces, repeated seven times

Every clinical step in the system is the same four things.

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
3. **A Task** is a unit of queued work. `Task.code` says which station (`triage`,
   `consultation`, `lab`, `pharmacy`, `review`, `billing`); `Task.status` says whether it
   is waiting; `Task.priority` carries urgency; `businessStatus` carries our own stage label.
4. **A Queue** is a React page listing `ready` Tasks for one station, with a button that
   launches the form.

### The rule that makes it work

**The form's mapping completes its own Task and creates the next one, in the same
transaction as the clinical data.**

A patient leaves the triage queue because a `Task` moved to `completed` in the database —
never because the browser navigated somewhere. If the transaction fails, nothing moved: no
observations, no state change. If it succeeds, all of it moved together. This is why there
is no workflow state in React. There isn't any.

Triage, for example, submits one transaction containing:

```text
  POST   Observation  × 5–8      the vital signs
  PATCH  Task         triage       → completed
  PATCH  Encounter                 → triaged
  POST   Task         consultation → ready
```

Ten writes, one transaction. The clinician's queue fills because the last write happened.

### The queue is one component

`OpdQueue` is a `ResourceListPage<Task>` filtered on `code` + `status=ready`, with
`_include` of `Task:patient` and `Task:focus:Encounter` so the launch context resolves out
of the row's own bundle without a lookup per row. A station is a Task code, a title and a
form:

```tsx
<OpdQueue
    taskCode="triage"
    headerTitle={t`Triage queue`}
    questionnaireId="opd-triage"
    actionTitle={t`Record triage`}
    emptyReportTitle={t`Waiting for triage`}
/>
```

One queue can serve several stations — `stations` is a list and each row's action is chosen
from its own Task code. The clinician's queue does this, listing new consultations and
post-laboratory reviews together, because they are the same person doing the same job at
different points in the visit. Comma-separated tokens are an OR in FHIR search, so it is
still one query.

### Adding a station

Always the same five pieces: pick a Task code; have the *preceding* mapping create that
Task (keyed on the visit key with `ifNoneExist`, so a resubmit cannot enqueue twice); write
the station's Questionnaire and Mapping, whose mapping completes that Task and does whatever
comes next; add an eight-line `OpdQueue` wrapper; route and menu it. Then check the gateway
allowlist for any new resource types.

---

## 4. The concepts in the seeds

### FCE — the shorthand the questionnaires are written in

The YAML under `resources/fhir-seeds/Questionnaire/` is **not** FHIR. It is Beda's **FCE**
(FHIR Custom Entities) shorthand, which a converter service turns into real FHIR before
upload. Real FHIR puts most questionnaire behaviour in verbose extensions; FCE writes them
as plain keys:

```yaml
  - linkId: national-id
    type: string
    text: National ID
    enableWhenExpression:
      language: text/fhirpath
      expression: "%resource.repeat(item).where(linkId='birth-date').answer.valueDate.exists()"
```

becomes an `sdc-questionnaire-enableWhenExpression` extension wrapping a `valueExpression`.

These keys look like fields and become extensions: `enableWhenExpression`,
`answerExpression`, `choiceColumn`, `referenceResource`, `initialExpression`, `itemControl`,
`hidden`, `mapping`. Everything else — `linkId`, `type`, `text`, `required`, `repeats`,
`item`, `answerOption`, `answerValueSet`, `enableWhen` — is core FHIR and passes through.

### Mapping is not a real resource type

HAPI has never heard of `Mapping`. The seed tooling runs with `--embed-mapping`, so the
mapping is folded *into the Questionnaire* as the `questionnaire-mapper` extension and only
the Questionnaire is uploaded. Two consequences: to confirm a mapping shipped, look inside
the Questionnaire; and editing **either** file re-uploads the Questionnaire, so a watcher
logging `Updated Questionnaire/opd-triage` after you changed `Mapping/opd-triage.yaml` is
correct, not a mislabel.

The single most useful debugging command in the repo is therefore:

```sh
curl -s http://localhost:8082/fhir/Questionnaire/opd-triage | python3 -m json.tool | less
```

If an FCE key you wrote is missing from that output, it did not convert.

### Launch context

`%Patient`, `%Encounter` and `%Author` are supplied by the surface that launches the form —
the queue row, or a patient list row. `%resource` is the form being filled in. Mappings and
`enableWhenExpression` read them, and the names are case-sensitive and must match what the
questionnaire declares. A missing launch variable is the commonest cause of a 500 from
extraction.

### The visit key, and why everything is idempotent

HAPI is configured with `server_id_strategy: UUID`, so a mapping cannot choose or predict a
resource id — it cannot say "the Task for encounter 123". Instead everything keys off a
**business identifier** derived from the visit: `<patient-id>-<date>`, assigned to
`Encounter.identifier` by `opd-start-visit`. Every downstream resource derives its own
identifier from it:

| Resource | Identifier |
| --- | --- |
| Condition | `<visit-key>-dx-primary`, `-dx-secondary` |
| ServiceRequest | `<visit-key>-lab-<test code>` |
| MedicationRequest | `<visit-key>-rx-<medication code>` |
| Specimen / DiagnosticReport | `<visit-key>` |
| Lab result Observation | `<visit-key>-<order id>` |
| MedicationDispense | `<visit-key>-<prescription id>` |
| Task | `<visit-key>-triage`, `-lab`, `-pharmacy`, `-billing` |

Combined with `ifNoneExist`, that makes the whole visit idempotent: resubmit any form and it
updates in place rather than duplicating. Repeat vitals and repeat result readings are the
deliberate exception, because a second reading is clinically legitimate.

Known limitation: one visit per patient per day. A genuine second attendance needs a real
visit counter.

### Repeating groups

Anything of variable length — prescriptions, lab orders, results, invoice lines — is a
repeating group, and the extraction engine iterates it. The trap is the capture syntax:
`{{ … }}` returns a **single value** (a repeating answer silently collapses to the first),
`{[ … ]}` returns a **collection**.

```yaml
  - linkId: prescription
    type: group
    repeats: true
    item: [...]
```

```yaml
    - rxRows: "{[ %QuestionnaireResponse.repeat(item).where(linkId='prescription') ]}"
    - "{% for index, row in %rxRows %}":
```

**Key rows by content, not position.** Deleting a row shifts every later `%index`, so an
`%index`-keyed `ifNoneExist` creates duplicates and orphans the originals on resubmit. Use
something from the row — a code, a referenced id. The one exception is invoice lines, where
the same service can legitimately appear twice and position *is* the right key.

### Constraining options to this patient

A dropdown does not have to be a static list. `answerExpression` queries the FHIR server,
templated with launch context — which is how the pharmacy form offers only prescriptions
actually written for the visit in front of you:

```yaml
      - linkId: dispense-prescription-1
        type: reference
        referenceResource: [MedicationRequest]
        answerExpression:
          language: application/x-fhir-query
          expression: "MedicationRequest?encounter={{ %Encounter.id }}&status=active"
        choiceColumn:
          - forDisplay: true
            path: "medicationCodeableConcept.coding.first().display"
```

The lab form does the same with `ServiceRequest?encounter={{ %Encounter.id }}&status=active`.

This buys more than a constraint. The lab form previously assumed slot 1 meant order 1, so a
technician entering results out of order would file the malaria result against the FBC
request and close the wrong order — silently, with no error. Selecting the order itself
removes the assumption: `Observation.basedOn` points at the request the result answers, and
the mapping closes exactly that request.

**The trade-off:** a reference answer carries no code. The `MedicationDispense` points at
the `MedicationRequest`, which carries the coding — correct normalisation, but a report
wanting the code must follow the link. And the queried resource type must be on the gateway
allowlist, or the dropdown is silently empty.

### Terminology — CodeSystem, ValueSet, and the swap seam

Anything the clinician picks from a list is a `CodeSystem` (the codes) plus a `ValueSet`
(what a field offers). Fields bind **by ValueSet canonical URL, never by inlined
`answerOption`**:

```text
Questionnaire item
  └─ answerValueSet: https://emr.nawi.ke/fhir/ValueSet/opd-diagnosis
                     └─ compose.include.system: https://emr.nawi.ke/fhir/CodeSystem/opd-diagnosis
```

That one rule is what makes substitution cheap. To move to licensed ICD-10 or a
facility-supplied catalogue: seed the replacement CodeSystem, repoint
`compose.include.system`, keep the ValueSet's own `url` unchanged, and confirm with
`$expand`. No questionnaire, no mapping and no application code changes. Existing
`Condition` resources keep the codes they were recorded with — this is a forward change,
not a migration.

Two things must both be true for a dropdown to populate: HAPI must have fulltext search
enabled (`$expand` runs on the Hibernate Search index, and without it expansion fails with
`HSEARCH800001` and the control silently offers nothing), and `src/services/expand.ts` must
expand against *this* server, because local canonicals exist nowhere else.

### The gateway allowlist

Every FHIR call from the browser passes through `fhir-gateway`, which only permits paths in
`resources/gateway-config/hapi_allowed_queries.json` — two entries per resource type, one
for GET-by-id and one for search. A missing entry is a rejection, not a FHIR error, so the
symptom is usually "nothing loads". The file is read once at startup, so changes need a
gateway restart.

The allowlist is **type-level, not role-level**: it says which queries any authenticated
user may run, so each entry added for a feature widens access for everyone.

---

## 5. The stations, and what each one writes

| Station | Role | Writes | Hands off to |
| --- | --- | --- | --- |
| Reception | receptionist | Patient, Coverage, Encounter (`arrived`), access List entry | triage |
| Triage | triage nurse | Observation × 5–8 (complaint + vitals); Encounter → `triaged`; priority onto the next Task | consultation |
| Consultation | clinician | Condition (+ note Observation), ServiceRequest × n, MedicationRequest × n; Encounter → `in-progress` | laboratory **and** pharmacy, in parallel |
| Laboratory | lab technician | Specimen, one Observation per result, DiagnosticReport; closes the ordered ServiceRequests | review |
| Pharmacy | pharmacist | MedicationDispense × n, each linked to the prescription it satisfies; closes the MedicationRequests | billing |
| Review | clinician | ClinicalImpression, a *new* confirmed Condition, optionally new prescriptions | billing (or back to pharmacy) |
| Billing | cashier | ChargeItem × n, Invoice, PaymentReconciliation; Encounter → `finished` | — |

Triage writes LOINC-coded vitals: presenting complaint (8661-1), temperature (8310-5),
heart rate (8867-4), respiratory rate (9279-1), oxygen saturation (2708-6), blood-pressure
panel (85354-9), weight (29463-7), height (8302-2). Required fields are required so the
mapping cannot create incomplete vital-sign resources; the optional ones are conditional.

**Laboratory and pharmacy run in parallel, not in sequence.** The consultation creates both
work items up front, so a patient waiting for results is not blocking their prescription.

### The review, and why a revised diagnosis is a new Condition

The clinician reads the results and records a **`ClinicalImpression`** — `supportingInfo`
takes the report, `summary` the note, `code` the outcome. The first attempt used an
`Observation` with `basedOn` pointing at the `DiagnosticReport`, and HAPI rejected it: R4
restricts `Observation.basedOn` to order-shaped resources. The lesson generalises — when a
reference will not fit, the resource is usually wrong before the reference is; look for the
more specific resource type before forcing it through a permissive field.

A revised diagnosis is written as a **second, `confirmed` Condition**, not an edit. The
provisional diagnosis stays exactly as it was: the record should show what was believed at
the time, not be rewritten once the answer is known.

Review can also prescribe — the commonest OPD shape is empiric treatment at consultation,
labs to confirm, then the real prescription once the answer is known. New orders are keyed
`<visit-key>-rx-review-<code>` so prescribing the same drug twice creates a second order
rather than colliding.

### Who releases billing — the one awkward piece of routing

Because laboratory and pharmacy run in parallel and a mapping cannot ask "is everything else
finished yet?" (the template engine has no aggregation), the rule is spread across three
mappings:

| Situation | Who sets `<visit-key>-billing` | To |
| --- | --- | --- |
| Consultation ordered nothing | The consultation itself | `ready` |
| Lab work happened, no prescription at review | The clinician's **review** | `ready` |
| Prescriptions were written | The **pharmacy**, once dispensed | `ready` |
| Review prescribes | The **review** parks it, the pharmacy releases it | `on-hold` → `ready` |

Two mechanics make the last row safe. The pharmacy work item is reopened with a conditional
**`PUT`**, not `POST … ifNoneExist` — a visit gets one pharmacy item, and `ifNoneExist`
would match an already-`completed` one and create nothing, so the prescription would exist
and never be dispensed. And billing is parked at `on-hold` rather than left uncreated,
because pharmacy may already have set it `ready`, and taking payment then would send the
patient home short of the drugs just prescribed. The queues filter `status=ready`, so
`on-hold` takes the visit off the cashier's list.

**Known gap, deliberately left open.** When both branches run, billing is released by
whichever finishes first, so a patient can reach the cashier while the other branch is still
open. Expressing "all services complete" needs aggregation the engine cannot do; the
realistic fixes are a small server-side hook or a computed flag on the cashier's queue.

### Billing and the close

Invoice lines are **proposed from the visit and priced from the price list**: one line for
the consultation, one per laboratory order, one per dispense (per unit dispensed), plus any
the cashier adds. Prices come from `ChargeItemDefinition` resources — one per billable code,
maintained on the administrator's Price list page — and the form shows line totals, the
subtotal, an optional discount and the balance live. Each `ChargeItem` points back at the
definition it was priced from, so an invoice is auditable against the tariff. The mapping
recomputes every total from the rows rather than trusting the display. How the two expression
engines share the work is in `docs/opd-billing-workflow.md`. Payment is
**recorded, not reconciled** — `PaymentReconciliation` captures the amount, the method and a
reference the cashier types (an M-Pesa code, say), but nothing reaches Safaricom, no insurer
is contacted, and nothing verifies the money arrived. The cashier asserts what was received,
exactly as a paper receipt book would.

Billing is the **only** station that moves `Encounter.status` to `finished`. That makes "is
this visit over?" answerable from one field, and means an unbilled visit stays visibly open.

---

## 6. Two FHIR mechanics worth knowing

**Conditional array elements work.** `DiagnosticReport.result` is built from conditional
entries, so a report with two results gets exactly two references — no dangling placeholder.

**Conditional references work.** HAPI resolves a reference written as a search during the
transaction, so a form can link to a resource without carrying its id. Conditional `PATCH`
by identifier works the same way, which removes the need to add a launch variable just to
carry a Task id:

```yaml
        url: "Task?identifier=https://emr.nawi.ke/fhir/sid/opd-task|{{ %visitKey }}-triage"
```

---

## 7. Authorization — the largest gap

**Authentication and authorization are different questions.** Keycloak answers *who are
you?* well. *Are you allowed to do this?* is barely answered at all.

Every call passes three gateway checks: is the token valid and ours; is the path on the
allowlist; and does `ListAccessChecker` permit this patient (each token carries a
`patient_list` claim naming a FHIR `List`). **The user's role is never consulted** in any of
them. Keycloak puts `realm_access.roles` in the token and the gateway ignores it; the role
is read only by the frontend, to decide which menu items to draw. And an allowlisted query
bypasses the patient check by design — which is why `Patient?_sort=…` lets any authenticated
user list every patient.

Concretely, today: a pharmacist can `POST /Condition`, a receptionist can write a
prescription, a lab technician can mark an invoice paid, and any authenticated user can read
any clinical record. The one thing that does work is that an unauthenticated request gets
nothing.

**What the client does enforce** — the sidebar shows each role its own station, routes are
mounted per role (so typing `/queue/billing` as a triage nurse redirects rather than
loading), record actions are gated, and role resolution fails closed rather than defaulting
a misconfigured account to `clinician`. This is a genuine usability and data-quality win:
staff cannot reach the wrong station *by accident*. **It is not a security control and must
not be described as one** — every check runs in the browser and the token is unchanged by
any of them.

**Why there is nothing to adopt.** Beda targets Aidbox, whose model is the `AccessPolicy`
resource — and of the eight Beda ships, five are `engine: allow` (permit everything), one
per role. Default Beda is *authenticated and holds a role → do anything*. Beda's Developers
Guide has no access-control page at all. Our gateway offers two checkers, `list` and
`patient`, and both answer *which patients*; neither has any notion of the user's role, so
no combination expresses "a pharmacist may not write a Condition".

**The decided fix** is a custom role-aware `AccessChecker` plugin for `fhir-gateway`,
holding the permission matrix as a resource file read at startup rather than hard-coded
Java, and keeping the patient-compartment check as well as adding role/operation checks.
Three details it must handle: `Task` needs restricting by `Task.code` (everyone creates and
completes Tasks — a pharmacist may complete a `pharmacy` Task, not a `consultation` one);
reads stay patient-scoped as well as role-scoped; and the receptionist's write to the access
List is a privileged write deserving narrower treatment. It also means the deployment stops
using the stock gateway image, so Compose and CI must build a derived one — most of the
non-Java effort. The real test is negative, one `curl` per forbidden pairing, in CI.

Until it lands, the available mitigations are weak and worth stating plainly: trusted-network
deployment only, one account per real person so the audit trail in `Task.requester` and
`Observation.performer` means something, narrowing the allowlist, and not presenting role
separation to a clinic or auditor as a security control.

---

## 8. Caveats that have already cost a day

**The seed watcher is a watcher, not a synchroniser.** `watch-fhir-seeds` uploads on change
events only. A new *directory* is not watched until the container restarts; a new *file* is
not uploaded until it changes; and it sometimes uploads a **stale read** — firing on the
filesystem event and reading the file before your write landed, then logging a confident
`Updated …` having uploaded the previous content. The log line is not proof; read the
resource back and check `meta.versionId`. A full `docker compose up` has none of these
problems, because `build-fhir-bundle` walks the whole tree.

**Editing a Mapping strips its Questionnaire's `launchContext`.** Not a race — it reproduces
exactly, every time, with a bare `touch`. The watcher re-pushes the paired Questionnaire to
embed the new mapping, and that re-push does not run the resource back through the FCE
converter, so every `sdc-questionnaire-launchContext` extension is dropped. The symptom is
delayed and misleading: the form still lists, opens and renders, and fails only on submit
because `%Patient`, `%Encounter` and `%Author` resolve to nothing — so it surfaces as a
broken *mapping*, several steps from the edit that caused it. **Edit the Mapping first and
the Questionnaire last.** `check-seeded-launch-context.sh` detects and fixes it, and is
wired into `validate-workflow.sh`.

**PATCH bodies must be FHIRPath `Parameters`.** HAPI rejects a plain resource fragment with
`HAPI-0537: Unable to determine PATCH body from request`. Several upstream Beda mappings
emit the plain form, which works on Aidbox and fails here — so `type: FHIRPath` alone does
not make an upstream mapping usable; check its PATCH entries too.

**Most upstream Beda containers crash on Nawi roles.** Upstream's `role.js` matches
`user.role[0].name` against four keys; Nawi has eight roles, and any other resolves to
`undefined`, which is then called (`d(...) is not a function`). Twelve upstream containers
reach that code. Nothing catches it early — exports resolve, TypeScript passes, the FHIR
queries are valid; it fails only when a real user renders it. `check-upstream-role-safety.py`
guards this in CI. When a container is unusable, write a Nawi one on `ResourceListPage`
using this repo's `matchCurrentUserRole`. **Never patch `contrib/fhir-emr` — it is a
submodule.**

**A hidden `required` field still blocks submission.** Beda builds its validation schema from
the whole questionnaire, not the enabled items, so `required: true` on a field hidden by
`enableWhenExpression` makes the form permanently unsubmittable with no visible field to
explain why. Set `required: false` and enforce the rule elsewhere —
`BaseQuestionnaireResponseForm` takes a `customYupTests` prop for genuinely conditional
validation.

**`enableWhenExpression` must return a boolean.** A FHIRPath comparison against an
unanswered field returns *empty*, not false, and the renderer throws. Guard with
`.exists() and …`.

**Empty dropdown?** Three candidates, in order: the ValueSet does not expand (fulltext search
off, or `expand.ts` pointing elsewhere); the gateway is blocking the query; or
`answerExpression` returns nothing — try the search directly against HAPI. `$lookup` working
while `$expand` returns zero means the concepts are stored but the index is not built. A
stubbornly empty expansion is usually stale cached state, since HAPI persists pre-expansions.

**Watch for Aidbox-only features.** This deployment is HAPI. Beda's reporting engine
(`$query`, `$run`), its provenance/audit UI and its file upload (`$generate-upload-url`) are
all Aidbox-only and do not work here. Do not build on them; record the gap.

---

## 9. Testing and verification

The fastest way to develop a mapping is to call extraction directly, which isolates it from
form rendering, login and clinical context. The operation is `POST
{sdcBackendUrl}/Questionnaire/$extract` — no questionnaire id in the path, and **not**
`/QuestionnaireResponse/$extract`, which 404s. The body is a `Parameters` carrying the
`Questionnaire` itself (the service reads the embedded mapping from it — omitting it fails
with an unhelpful 500), one entry per launch-context variable named exactly as the
questionnaire declares it, and the `questionnaire_response`. The reply is the
`transaction-response`: read each entry's `response.status` — `201` created, `200` matched an
existing resource via `ifNoneExist`, and a conditional entry whose `{% if %}` was false is
simply absent.

**There are no automated tests in `src/`.** CI runs the role-safety guard, `typecheck` and
`lint`. Several bugs here passed typecheck, lint, export checks and live FHIR queries and
failed only on render, so static checks do not substitute for opening the page as the
relevant role.

Seeded accounts, password `password` for all, each landing on its own queue:
`receptionist`, `triage-nurse`, `clinician`, `lab-technician`, `pharmacist`, `cashier`,
`administrator`, `patient`.

---

## 10. What is local, and what it would take to replace

A standing requirement: wherever V1 substitutes a local or simplified implementation, it
records what is local, the exact seam a replacement plugs into, the swap procedure, and what
does *not* change — so the blast radius is bounded.

| Substitution | Seam | Status |
| --- | --- | --- |
| Local diagnosis (30), lab (15) and drug (25) catalogues instead of licensed ICD-10 | `answerValueSet` canonical URL; repoint `compose.include.system` | Seeded and expanding. **None clinically reviewed** — placeholders awaiting sign-off. |
| Payment recorded, not reconciled — no M-Pesa, SHIF or insurer integration | `PaymentReconciliation` with a `paymentIdentifier` and a method coding | Out of V1 by decision. Add the reconciliation service, match on the existing identifier, set status from the verified state; invoice and charge generation untouched. |
| Clinical notes as an `Observation` (LOINC 51847-2), not a `DocumentReference` | The mapping entry in `opd-consultation` | Needs attachment storage, which this stack lacks. Add the DocumentReference entry, keep writing the Observation for one release, then retire it. |
| Placeholder tariff (46 `ChargeItemDefinition` seeds) instead of the clinic's price list | `resources/fhir-seeds/ChargeItemDefinition/`, edited live on the Price list page | Amounts are guesses awaiting review; the structure is final. Replace the numbers, not the seeds. |
| HAPI-only feature set | Aidbox-only operations | Recorded as gaps, each naming the component that would provide it, so the decision stays revisitable. |

Also standing: no prescribing safety checks (the formulary carries no strengths, forms,
interactions or contraindications, and nothing checks `AllergyIntolerance`); lab results are
free text rather than typed quantities with units and reference ranges, so they cannot drive
trends or abnormal-flagging; no `Claim` is generated even where the patient has `Coverage`;
and nothing renders a receipt. Charges *are* now derived from what happened — the billing
form walks the encounter's ServiceRequests and MedicationDispenses — but there is no "add
price" action for a code outside the catalogues, and registration is not auto-detected.
