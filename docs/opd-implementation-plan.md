# OPD workflows — triage and implementation plan

Source requirement: *Outpatient Department (OPD) Workflows — Beda EMR Configuration Guide for Private Clinics*, v1.0, May 2026, NawiTech Limited.

This plan triages that document against the repository, names the decisions that had to be locked before building, and sequences the work. It is a living document: section status is updated at the end of each sprint.

**Status: Sprints 0–3 delivered. The OPD journey is complete.** Reception → triage → consultation → laboratory / pharmacy → results review → billing, closing the `Encounter` as `finished`. All seven stations verified end to end. What remains is hardening, not the happy path — see §8.

Companion documents, each owning one thing this plan only summarises:

| Document | Covers |
| --- | --- |
| `docs/opd-triage-workflow.md` | The shipped reception-and-triage workflow: data, transition, integration, verification. |
| `docs/developer-guide.md` | **Start here if you are new.** How the system works, tutorials for common changes, and the caveats that have already cost a day. |
| `docs/opd-consultation-workflow.md` | Consultation, laboratory and pharmacy: data, repeating groups, and scope boundaries. |
| `docs/opd-billing-workflow.md` | Results review and billing: the hand-off gap, the invoice, and why payment is recorded rather than reconciled. |
| `docs/opd-authorization.md` | What is enforced today, how default Beda does it, the permission matrix, and what the `AccessChecker` plugin involves. |
| `docs/opd-terminology.md` | Diagnosis, lab and formulary catalogues, the HAPI prerequisites, and how to swap them. |
| `docs/frontend-image.md` | The frontend Docker image, why it fails locally, and the multi-stage replacement. |
| `.claude/skills/beda-workflow/` | Working conventions for building these workflows, including the HAPI-vs-Aidbox constraints found along the way. |

Effort key: **S** ≤ half a day · **M** 1–2 days · **L** 3–5 days · **XL** > 1 week.

---

## 1. Where the repository stood

> **Baseline at 2026-09-09, before Sprint 0.** Kept as the starting point this plan was written against. For what changed, see §8.

| Layer | State |
| --- | --- |
| Roles | All 8 doc roles exist as Keycloak realm roles and as `Role` enum in `src/utils/role.ts`. Seeded users exist for each. |
| Routes | `/patients`, `/patients/:id/*`, `/organizations` only (`src/containers/App/routes.tsx`). |
| Menu | Every non-admin role sees the same single "Patients" item (`src/containers/App/layout.tsx`). |
| Workflow seeds | 3 questionnaires + 3 mappings: `patient-create`, `patient-edit`, `opd-triage`. |
| Workflow state | One `Task` (`code=consultation`, `businessStatus=ready-for-consultation`) written atomically by `Mapping/opd-triage`. |
| Encounter | **Absent everywhere** — no route, no seed, no gateway allowlist entry, not referenced by triage. |
| Gateway | `ACCESS_CHECKER=list` (patient-compartment), path allowlist in `resources/gateway-config/hapi_allowed_queries.json`. |
| CI | Builds and deploys. Does not run `typecheck` or `lint`. No tests in `src/`. |

The PoC is a single, correct vertical slice: one form, one atomic transaction, one queued handoff. Everything below is about making that pattern repeatable and safe.

---

## 2. Gap matrix — doc section by doc section

> Status as of end of Sprint 1.

| Doc § | Requirement | Status | Gap |
| --- | --- | --- | --- |
| 2 | Role → write/read FHIR resource matrix | ❌ Not enforced | Gateway checker is patient-compartment, not role-based. See **B1**. |
| 3 | 7-step journey keyed on `Encounter.status` | ✅ Done | All seven steps: `arrived → triaged → in-progress → finished`. |
| 4.1 | Registration (demographics, National ID, phone, NOK, Coverage) | ✅ Done | `patient-create` captures demographics, typed National ID, next of kin, address and insurance, and writes a `Coverage`. `opd-start-visit` creates the Encounter and places the patient in the triage queue. |
| 4.2 | Triage vitals | ✅ Done | Height added, optional vitals made conditional, priority captured onto `Task.priority`. Sprint 0. |
| 4.3 | Consultation — Condition, MedicationRequest, ServiceRequest, CarePlan, AllergyIntolerance, DocumentReference | 🟡 Partial | Condition, ServiceRequest and MedicationRequest delivered. Notes are an Observation pending attachment storage. CarePlan and AllergyIntolerance not modelled. |
| 4.4 | Laboratory — Specimen, Observation, DiagnosticReport | ✅ Done | Lab queue, specimen, results and report delivered. Results are free text, not typed quantities. |
| 4.5 | Pharmacy — MedicationDispense, stock | 🟡 Partial | Dispensing delivered against a local formulary. No interaction or allergy checking; stock remains out of scope. |
| 4.6 | Billing — ChargeItem, Invoice, PaymentReconciliation, Claim | 🟡 Partial | ChargeItem, Invoice and PaymentReconciliation delivered. Price list (`ChargeItemDefinition` per billable code, admin-editable) delivered; invoice lines are derived from the visit and priced from it, with live totals. Tariff is a placeholder. No `Claim`, no receipt, and payment is recorded rather than reconciled. |
| 5 | Per-role queue views | ✅ Done | All five queues live on a shared `OpdQueue`. The clinician's lists two stations — new consultations and post-lab reviews — in one worklist. |
| 6 | Reports (MOH 705, revenue, lab register) | ❌ Not started | Beda's reporting engine is Aidbox-only. See **B6**. |
| 7 | Phased rollout | — | Re-sequenced in §8 below. |

---

## 3. Cross-cutting blockers

These are not features. Each one silently breaks workflows built on top of it, so they are sequenced first.

### B1 — The gateway cannot express the role matrix · 🟡 partly resolved, core blocker stands · **L**

`docker-compose.yml` sets `ACCESS_CHECKER=list`. Each JWT carries a `patient_list` claim naming a FHIR `List`; the gateway grants access to the patient compartment of the patients in that list.

Three consequences were identified. **Two are resolved, and one of the three was wrong:**

1. ~~The seed List contains one patient, so every other patient is invisible.~~ **Resolved.** Still true of the seed itself, but registration now grows the List — see below.
2. ~~A patient registered by the receptionist is not added to that List.~~ **This was incorrect.** `Mapping/patient-create` already patched `List/list-patient-1` before this plan was written; the claim was made from reading the questionnaire rather than the mapping. Verified live in Sprint 1: registering a patient resolves `urn:uuid:new-patient` into both the `Coverage.beneficiary` and the new List entry, and the List grew from one to two.
3. ~~`cashier`, `administrator` and `patient` have no `patient_list` attribute.~~ **Resolved** in T0.1, and confirmed to survive a realm re-import from the seed after a volume reset.

**What remains is the real blocker.** The path allowlist is not an authorization layer — nearly every entry is `allowExtraParams: true, allParamsRequired: false`, i.e. any authenticated user may run any search shape on those resource types. Doc §2's write matrix still has no enforcement point anywhere in the stack.

**Resolved (D3).** Short term, keep `list` and make registration maintain the List inside the same transaction that creates the Patient (self-healing, no new infrastructure).

In parallel, **implement a custom `AccessChecker` plugin** for `fhir-gateway` — the proxy supports pluggable checkers, and NawiTech has committed to this rather than living with the compartment model. Two practical consequences to plan for: the plugin is JVM code, so it needs its own build and test cycle; and the deployment stops using the stock `fhir-gateway:latest` image, so `docker-compose.yml` and CI must build and publish a derived image. Neither is hard, but both are new infrastructure the repository does not have today.

### B2 — No Encounter, so no journey and no queues · ✅ resolved (Sprint 1)

The doc's entire model — §3 status transitions, §5 queue filters — keys off `Encounter`. The repo has no encounter route, no encounter seed, and no `Encounter` entry in the gateway allowlist. `docs/opd-triage-workflow.md` already flags this as the deliberate next increment.

Everything from registration onward depended on this, which made it the highest-leverage item in the plan.

**Resolved.** `opd-start-visit` creates the Encounter, triage runs against it, and every triage observation carries an `encounter` reference. `/encounters` lists them. What remains is the encounter *detail* page — Beda's `EncounterDetails` reaches upstream's role matcher, so it needs a Nawi container (see §6).

### B3 — Workflow state model is undecided · ✅ resolved (D1, built in Sprint 1)

The PoC uses `Task`. The doc says use `Encounter.status` plus `Encounter.class` for the current station. These are different models and mixing them ad hoc will produce contradictory state.

Note also that `Encounter.class` is bound to HL7 `ActEncounterCode` (`AMB`, `EMER`, `IMP`, …). It means *kind of visit*, not *current station*. Using it as a station pointer is a misuse that will break any downstream consumer or report that reads it normally.

**Recommendation (D1):** hybrid, with a single authority per concern.
- `Encounter.status` = the visit lifecycle. R4 legitimately includes `triaged`, so `planned → arrived → triaged → in-progress → finished` is valid as written.
- `Task` = the unit of queued work at each station: who owns it, is it claimed, is it done.
- `Encounter.class` stays `AMB`. Station lives in `Task.code`.
- Priority (§4.2 step 5) goes on `Task.priority` (`routine | urgent | asap | stat`), with `Flag` reserved for persistent patient-level alerts rather than per-visit urgency.

**Built as specified.** `Encounter.status` runs `arrived → triaged`; `Task.code` carries the station (`triage`, `consultation`); `Encounter.class` stays `AMB`; the nurse's priority lands on the consultation `Task.priority`.

### B4 — No terminology · 🟡 partly resolved (Sprint 1)

Doc §4.3 requires ICD-10 diagnosis coding "for insurance claims", with free-text search and autocomplete. §4.4 needs a lab test catalogue, §4.5 a drug catalogue.

**Resolved (D4).** ICD-10 is not licensed for this deployment, and the target clinic has no existing test menu or formulary to seed from. All three catalogues are therefore locally authored. The design constraint that follows is **swappability**: questionnaires must reference catalogues by `answerValueSet` canonical URL only, never by inlined `answerOption`, so that replacing a local CodeSystem with a licensed or facility-supplied one is a seed change and nothing more.

**Diagnoses are done.** A 30-concept local `CodeSystem` + `ValueSet` is seeded and expands. Getting there required enabling Hibernate Search in `resources/hapi-config/application.yaml` — on the default config `$expand` fails with `HSEARCH800001` and the autocomplete silently offers nothing. Full detail, including the swap procedure, is in `docs/opd-terminology.md`.

The concept list has **not been clinically reviewed**; it is a placeholder for sign-off.

**Still open:** the lab test menu and the drug formulary (T3.6). The clinic has no existing catalogues to seed from, so both are locally authored on the same pattern.

### B5 — Repeat submission creates duplicate clinical records · ✅ resolved (Sprint 0, extended in Sprint 1)

`Mapping/opd-triage` uses unconditional `POST` for all eight entries. Re-opening and re-submitting the triage form produces a second set of vitals **and a second `ready-for-consultation` Task** — a duplicate work item in a queue that does not exist yet, but will.

**Resolved.** Every resource in a visit now keys off one **visit key** — the business identifier `opd-start-visit` puts on the Encounter. The Encounter and both Tasks use `ifNoneExist` against it, so resubmitting either form updates in place. Verified live: a second triage submission returns `200 OK` on the Task and leaves the Task count unchanged.

Observations are deliberately *not* deduplicated — repeat vitals within a visit are clinically valid. The duplicate that breaks a workflow is the queue item, and that is the one prevented.

### B6 — Reporting engine is Aidbox-only · ❌ open · **XL**

Doc §6 lists six reports. Beda's reporting path (`uberComponents/ViewChart/hooks.js`, `hooks/useViewDefinitionRows.js`) calls Aidbox-only `$query` and `$run` operations. `services/provenance.js` also uses `$query`, so Beda's audit-trail UI will not function on HAPI either.

On this stack, reports need a different approach entirely — SQL-on-FHIR against the HAPI Postgres, or an external BI layer. Not a configuration task.

**Scoped.** **MOH 705 is the priority report** — it has a regulatory driver the other five do not. Build that one against the diagnosis register and treat the rest as follow-on work.

### B7 — Repository hygiene and quality gate · ✅ resolved (Sprint 0)

- `error.txt` (a pasted browser stack trace) and `opd-triage.patch` (35 KB, already applied) are committed at repo root.
- CI (`.github/workflows/main.yml`) runs `extract`, `compile`, `build` — never `yarn typecheck` or `yarn lint`, despite both existing.
- No tests anywhere in `src/`.
- Two workflow files (`main.yaml` and `main.yml`) deploy to different targets on every push.

**Resolved.** Stray files deleted, the inherited `main.yaml` removed, and CI now runs the upstream role-safety check, `typecheck` and `lint` — all clean, from a starting point of 11 errors and 14 warnings. Still no tests in `src/`; that remains open.

---

## 4. Decisions

**Locked 2026-09-09** by NawiTech. All six decisions are now closed, along with every open question in §11. Sprint 0 is delivered — see §8.

| # | Decision | Resolution |
| --- | --- | --- |
| **D0** | Backend target | **Locked.** **HAPI is the V1 target**, and V1 scope is what HAPI supports. Any Beda or OHS capability that does not work on HAPI is documented as a gap rather than worked around. |
| **D1** | Authoritative workflow state | **Locked.** Hybrid: `Encounter.status` for visit lifecycle, `Task` for station work queues. Station in `Task.code`, never `Encounter.class`. |
| **D2** | Queue implementation | **Follows from D1.** `ResourceListPage<Task>` with `_include` of patient and encounter, filtered by `code` + `businessStatus`. See §5. |
| **D3** | Access control target | **Locked.** Keep the `list` checker for the demo and add List maintenance to registration. In parallel, build a **custom role-aware `AccessChecker` plugin** for `fhir-gateway` — NawiTech has confirmed this is the target, not a contingency. |
| **D4** | Terminology source | **Locked.** ICD-10 is **not licensed**. Author a local `CodeSystem` + `ValueSet` of common clinic diagnoses, designed to be swapped for a licensed ICD-10 later without touching questionnaires. Same approach for the lab menu and formulary — no existing catalogues to seed from. |
| **D5** | Billing depth | **Locked.** ChargeItem + Invoice + a recorded payment. **No M-Pesa reconciliation in V1** — but the extension point is documented in code comments and in the workflow guide. |

---

## 5. The queue recipe

Doc §5 is the backbone, and it is now built: `src/containers/OpdQueue/index.tsx` is a single component parameterised by station, with `TriageQueue` and `ConsultationQueue` as thin wrappers. Adding a station is a Task code, a title and a questionnaire id.

The shape it implements:

```tsx
<OpdQueue
    taskCode="triage"
    headerTitle={t`Triage queue`}
    questionnaireId="opd-triage"
    actionTitle={t`Record triage`}
    emptyReportTitle={t`Waiting for triage`}
/>
```

Underneath: a `ResourceListPage<Task>` filtered on `code` + `status=ready`, with `_include` of `Task:patient` and `Task:focus:Encounter` so `getClinicalContext` can resolve both launch variables out of the row's bundle without a lookup per row.

`questionnaireId` is optional on purpose. The consultation queue omits it, because offering an action whose form cannot yet complete the Task would strand patients in the queue.

Each stage form's mapping then, in one transaction: writes its clinical resources, `PATCH`es the current Task to `completed`, advances `Encounter.status`, and `POST`s the next stage's Task. `Mapping/opd-triage` does exactly this.

Two details that cost time and are easy to get wrong:

- **PATCH bodies must be FHIRPath `Parameters`.** HAPI rejects a plain resource fragment with `HAPI-0537`.
- **Conditional PATCH by identifier works**, so a mapping can complete its own Task without carrying the Task id in launch context.

With those settled, stations 3–7 are largely repetitive.

---

## 6. Reuse inventory — what Beda already ships

`contrib/fhir-emr/resources/init-seeds` contains **82 questionnaires and 44 mappings** that are *not* loaded into this deployment (compose only bundles `resources/fhir-seeds`). This is the largest available shortcut, but it needs filtering.

**Two independent compatibility checks, and both must pass.**

1. **Engine.** 26 upstream mappings are `type: FHIRPath` and run on this stack's `fhirpath-extract` service. The other 18 are JUTE (`$let` / `$fn`) and are **Aidbox-only**.
2. **PATCH form.** HAPI requires a FHIRPath `Parameters` body and rejects a plain resource fragment with `HAPI-0537: Unable to determine PATCH body from request`. Several upstream FHIRPath mappings emit the plain form, so passing check 1 does not mean a mapping runs here. Confirmed in Sprint 1.

| Upstream asset | Engine | Verdict |
| --- | --- | --- |
| `complete-encounter` (+extract) | FHIRPath | **Adapt — highest value**, but its `PATCH` entry needs rewriting as a `Parameters` body. Finishes the Encounter and creates ChargeItem + Invoice in one transaction. Close to doc §4.6's core. |
| `encounter-create` (+extract) | FHIRPath | **Superseded** by `opd-start-visit`. Had two HAPI problems worth knowing: Aidbox `_assoc=practitioner` in an `answerExpression`, and a plain-fragment `PATCH`. |
| `medication-request` (+extract) | FHIRPath | **Adapt** for prescribing (§4.3/4.5). Contains a `PATCH` entry — rewrite it. |
| `pay-invoice`, `cancel-invoice` | FHIRPath | **Adapt** for §4.6. Both are PATCH-only mappings, so both need the `Parameters` rewrite. |
| `practitioner-create/edit`, `healthcare-service-create/edit` | FHIRPath | **Near drop-in** for admin master data. |
| `labs`, `vitals` | FHIRPath | Reference only; `opd-triage` already supersedes `vitals`. |
| `place-order` | FHIRPath | **Reference only.** AU pathology/radiology model, not a Kenyan lab panel. |
| `place-referral` | FHIRPath | **Reference only.** Creates Appointment + CommunicationRequest, not the ServiceRequest the doc specifies. |
| `order-lab-tests`, `allergy-extract`, `immunization-extract`, `prescription-confirm/cancel`, `patient-note-create`, `phq2phq9`, `medication-statement` | JUTE | **Unusable as-is.** Rewrite in FHIRPath if needed. |

**Compiled containers** are exported from `contrib/fhir-emr/dist/containers` — but routing one is not free, and this was the costliest wrong assumption in the original plan.

Upstream's `utils/role.js` matches `user.role[0].name` against an option map with four keys: `patient`, `admin`, `practitioner`, `receptionist`. Nawi has eight roles. Any other role resolves to `undefined` and is then invoked, giving a blank screen and `d(...) is not a function`. Exports resolve, TypeScript passes, the FHIR queries are valid, the module transforms — it only fails when a real user renders it.

Twelve upstream containers can reach that code: `App`, `EncounterDetails`, `EncounterList`, `HealthcareServiceList`, `InvoiceList`, `OrganizationScheduling`, `PatientDetails`, `PatientList`, `PatientQuestionnaire`, `PractitionerDetails`, `Prescriptions`, `VideoCall`. Reaching it is a risk signal rather than proof — `EMR` reaches it and works, because this app injects its own `getAuthenticatedClinicalContext` — but treat any flagged container as guilty until rendered as a Nawi role.

Safe to route as shipped: `InvoiceDetails`, `PractitionerList`, `DocumentsList`, `MedicationManagement`, `MedicationManagementDetail`, `QuestionnaireList`, `QuestionnaireBuilder`, `FormList`, `NotificationPage`, `MagicSearchPage`, `SetPassword`, `SignIn`, `AidboxFormsBuilder`.

`.claude/skills/beda-workflow/scripts/check-upstream-role-safety.py` enforces this, and runs in both `validate-workflow.sh` and CI.

For the reverse view — what this deployment gets from Beda for free, what we had to write, and why each custom component exists — see §4.1 and §4.2 of `docs/developer-guide.md`. Roughly: ~2,500 lines of seed configuration cover all seven clinical workflows, against ~610 lines of custom TypeScript, most of which is replacing three upstream containers that crash on Nawi roles.

Two HAPI caveats found by inspection:
- `Prescriptions` sorts by `_createdAt` — an **Aidbox-only** search parameter. It will fail on HAPI until sorted by `_lastUpdated`.
- `DocumentsList` file upload calls `$generate-upload-url` (`services/file-upload.js`), also Aidbox-only. DocumentReference *attachments* (§4.3 referral letters) need separate storage on this stack.

Everything else scanned is clean of Aidbox coupling.

---

## 7. Ranked backlog

**Sprint 0 is delivered** (2026-09-09). The nine ✅ items below are done, verified against the running dev stack, and documented in `docs/opd-triage-workflow.md`.

### Tier 0 — unblock, hours not days

| # | Task | Effort |
| --- | --- | --- |
| T0.1 ✅ | Add `patient_list` attribute to `cashier`, `administrator`, `patient` seed users. Two roles are non-functional without it. | S |
| T0.2 ✅ | Extend gateway allowlist: `Encounter`, `ServiceRequest`, `DiagnosticReport`, `Specimen`, `MedicationDispense`, `Medication`, `CarePlan`, `Coverage`, `ChargeItem`, `Invoice`, `PaymentReconciliation`, `Claim`, `Flag`, `DocumentReference`, `ValueSet`, `CodeSystem`. | S |
| T0.3 ✅ | Delete `error.txt` and `opd-triage.patch`; reconcile the two CI workflow files. | S |
| T0.4 ✅ | Add `yarn typecheck` and `yarn lint` to CI before `build`. | S |
| T0.5 ✅ | Align triage seed with doc §4.2: add height (8302-2); make RR, SpO2 and height optional; add priority/urgency item. | S |
| T0.6 ✅ | Give each role a distinct menu in `layout.tsx` instead of "Patients" for everyone. | S |

### Tier 1 — low-hanging, high leverage

| # | Task | Effort | Notes |
| --- | --- | --- | --- |
| T1.1 ✅ | **Surface encounters, invoices, practitioners and healthcare services.** | M | Delivered, but not as planned: three of the five upstream containers crash on Nawi roles and were replaced with Nawi equivalents. Only `InvoiceDetails` and `PractitionerList` were routed as shipped. |
| T1.2 ✅ | Make the triage transaction idempotent (**B5**) — stable Task identifier + `ifNoneExist`. | S | Establishes the pattern before it is copied six times. |
| T1.3 ✅ | Build the **first queue** (`ResourceListPage<Task>` consultation queue) against the Task the PoC already writes. | M | Proves §5 end to end with zero new seeds. |
| T1.4 ✅ | Extend `patient-create` to doc §4.1: typed National ID, phone, next of kin, county/sub-county. | M | Coverage and Encounter deferred to T2.1. |
| T1.5 ✅ | Author the local diagnosis `CodeSystem` + `ValueSet`; confirm `$expand` autocomplete works in a Beda form. | M | ICD-10 is unlicensed (**D4**). Reference by canonical URL only, so the catalogue can be swapped later. |

### Tier 2 — vertical slices (each is a full station)

| # | Task | Effort | Depends on |
| --- | --- | --- | --- |
| T2.1 ✅ | Registration → Encounter. Receptionist creates Patient + Coverage + Encounter (`arrived`) + triage Task, and adds the patient to the access List (**B1**), in one transaction. | L | T0.2, T1.4, D3 |
| T2.2 ✅ | Re-scope triage to the Encounter — the increment already specified in `docs/opd-triage-workflow.md` §"Next increment". | M | T2.1 |
| T2.3 ✅ | Consultation: Condition (ICD-10) + clinical notes + `Encounter.status → in-progress`; completes the consultation Task. | L | T1.5, T2.2 |
| T2.4 ✅ | Prescribing → pharmacy queue → MedicationDispense. | L | T2.3, drug catalogue |
| T2.5 ✅ | Lab order → lab queue → Specimen → results → DiagnosticReport → back to clinician review (doc §4.4, journey step 5). | L | T2.3, lab catalogue |
| T2.6 ✅ | Billing: adapt `complete-encounter` for ChargeItem + Invoice; add payment recording; `Encounter.status → finished`. | L | T2.3, D5 |

### Tier 3 — needs a decision or an integration

| # | Task | Effort |
| --- | --- | --- |
| T3.1 | **Custom `AccessChecker` plugin** for `fhir-gateway`, replacing the `list` checker (**B1**). Includes a derived gateway image in Compose and CI. | XL |
| T3.2 | **MOH 705** diagnosis register on HAPI (**B6**) — SQL-on-FHIR or external BI. Other five reports follow. | XL |
| T3.3 | M-Pesa / SHIF / private insurer claim integration. **Out of V1** — document the extension point only (**D5**). | XL |
| T3.4 | Pharmacy stock management (doc §4.5 notes OpenLMIS). | XL |
| T3.5 | Document/attachment storage to replace Aidbox `$generate-upload-url`. | L |
| T3.6 ✅ | Local lab menu and formulary `CodeSystem`s, on the same swappable pattern as T1.5. | M |
| T3.7 | Frontend image: ~~Compose profile~~ ✅ done, multi-stage build, CI trim. Decision record in `docs/frontend-image.md`. | M |

---

## 8. Sequencing

The doc's own §7 phasing is sound clinically but starts building before the substrate exists. Two changes: pull queues forward (nothing hands off without them), and pull access control forward (nothing is safe without it).

### Sprint 0 — substrate ✅ delivered

All of Tier 0, plus T1.1, T1.2 and T1.3.

Outcome, all verified live rather than statically:

- Every role has its own menu and landing page; `cashier` and `administrator` can reach the gateway at all for the first time.
- `/encounters`, `/invoices`, `/invoices/:id`, `/practitioners` and `/healthcare-services` all work. `InvoiceDetails` and `PractitionerList` are Beda's own; encounters, invoices and healthcare services needed Nawi containers, because the upstream ones crash on any role outside upstream's four. A guard in `validate-workflow.sh` and CI now blocks that regression.
- The consultation queue reads the Task triage writes, with `_include=Task:patient` resolving the patient in the same bundle.
- Triage now matches workflow guide §4.2 — height added, optional vitals genuinely optional, queue priority captured onto `Task.priority`.
- Resubmitting triage returns `200 OK` against the same Task instead of enqueueing a duplicate.
- CI gates on `typecheck` and `lint`; both are clean, from a starting point of 11 errors and 14 warnings.
- The patient **Resources** tab now reaches all eight clinical resource types. It had a route for `/:resourceType` but nothing rendered a switcher, so it redirected to `Condition` and the other seven — including the Observations triage writes — were unreachable.

Three findings carried forward, all now in the skill:

- **Upstream containers are role-incompatible.** Twelve reach a role matcher that only knows upstream's four roles. This is invisible to typecheck, lint, export checks and FHIR queries — it surfaces only on render, as a blank screen.
- HAPI does not know the `Mapping` resource type; the mapping ships embedded in the Questionnaire.
- `$extract` lives at `POST /Questionnaire/$extract` and needs the `Questionnaire` passed in its `Parameters`.

### Sprint 1 — doc phase 1 ✅ delivered

T1.4, T1.5, T2.1, T2.2 — verified end to end on a freshly reseeded database.

- Reception's **Start visit** opens an `Encounter` (`arrived`, class `AMB`) and enqueues triage.
- Triage runs against that Encounter, links every observation to it, completes the triage Task, advances the visit to `triaged`, and enqueues the consultation with the nurse's priority.
- Both queues are one shared `OpdQueue` component; a station is a Task code, a title and a form.
- `patient-create` now captures insurance and writes a `Coverage`, and already patched the gateway access List — the B1 self-healing fix was in place before this sprint.
- A local diagnosis `CodeSystem` + `ValueSet` expand through `$expand`, which required enabling Hibernate Search in HAPI (`docs/opd-terminology.md`).
- The whole visit is idempotent on a single **visit key**: resubmitting either form updates in place rather than duplicating.

Three stack findings, all now in the skill:

- **PATCH bodies must be FHIRPath `Parameters`.** HAPI rejects the plain-resource form with `HAPI-0537`, which is what several upstream mappings emit — so `type: FHIRPath` alone does not make an upstream mapping usable here. Conditional PATCH by identifier does work, and removes the need to carry ids in launch context.
- **`$expand` needs `fulltext_search_enabled`.** Without it, terminology autocomplete silently offers nothing. An empty expansion is usually stale cached state, not a bad seed.
- **`watch-fhir-seeds` does no initial sync** and does not watch directories created after it started. New seed types need a watcher restart plus a `touch`; the bundle path has neither limitation.

Also delivered opportunistically: `beda-frontend` moved behind a Compose profile, because its failing image build was aborting the entire `docker compose up` and blocking the reseed (item 2 of `docs/frontend-image.md`).

### Sprint 2 — clinical middle ✅ delivered

T3.6 catalogues, then T2.3 consultation, T2.4 pharmacy and T2.5 laboratory — all verified end to end through `$extract`.

- Consultation records diagnosis, certainty and notes; writes up to three lab orders and three prescriptions; advances the visit to `in-progress`; and enqueues the laboratory and pharmacy stations according to what was actually ordered.
- Laboratory records the specimen, one observation per result and a `DiagnosticReport`, and closes the ordered `ServiceRequest`s.
- Pharmacy records a `MedicationDispense` per item, linked to the prescription it satisfies, and closes the `MedicationRequest`s.
- Lab and pharmacy run in parallel — a patient waiting on results is not blocking their prescription.
- Lab menu (15) and formulary (25) catalogues seeded on the terminology pattern. **Neither is clinically reviewed.**
- Completed Tasks now also move their `businessStatus` to `completed`, instead of advertising the stage they were created in.

**A constraint that turned out not to exist.** These forms were first built with three fixed slots each, on the belief that the template engine could not iterate. It can: `{[ ]}` captures a collection and `{% for %}` loops it. The wrong conclusion came from a grep whose pattern could not match the real syntax. All four forms were later reworked to repeating groups — see the Sprint 3 follow-up below.

Two mechanics that made the mappings much simpler, both verified: **conditional array elements** (so `DiagnosticReport.result` has no gaps for unused slots) and **conditional references** (so a dispense links to its prescription by business identifier without either form carrying the other's id).

### Sprint 3 — closing the journey ✅ delivered

T2.6 billing plus the review loop. Verified end to end: a visit now runs reception → triage → consultation → laboratory *and* pharmacy → review → billing, finishing with `Encounter.status = finished`, six completed Tasks, an invoice of 3,550 KES over three line items, and a recorded M-Pesa payment.

- **Results review** is a `ClinicalImpression`, and a revised diagnosis is written as a second `confirmed` Condition rather than editing the provisional one. The record shows what was thought at the time.
- **The clinician's queue lists two stations** — `consultation` and `review` — in one worklist. `OpdQueue` now takes a list of stations and picks the form per row from the Task's own code.
- **Billing** writes ChargeItems, an Invoice and a PaymentReconciliation, and is the only station that closes the encounter.

**One FHIR lesson worth carrying.** The review note started as an `Observation` with `basedOn` pointing at the DiagnosticReport. HAPI rejected it — R4 restricts `Observation.basedOn` to order-shaped resources. `ClinicalImpression` exists for exactly this and made the mapping simpler. When a reference will not fit, the resource is usually wrong before the reference is.

**Known gap, deliberately left open.** When both laboratory and pharmacy run, the billing work item is created by whichever finishes first, so a patient can reach the cashier while the other branch is still open. Expressing "all services complete" needs aggregation, which the template engine cannot do. See `docs/opd-billing-workflow.md`.

### Follow-up — repeating groups ✅

The three-slot limit in consultation, laboratory, pharmacy and billing was not a platform constraint. The engine iterates; the original grep for `{% for %}` used a pattern that could not match `{% for index, row in %rxRows %}`, because `[^%]` stops at the `%` sigil.

All four form/mapping pairs now use repeating groups, verified with a visit carrying **four lab orders, five prescriptions, four results, five dispenses and four invoice lines** — every one past the old limit — closing at `Encounter.status = finished` with a correct 6,350 KES invoice.

Idempotency keys moved from position to content (`-rx-<medication code>`, `-<order id>`) because deleting a row shifts every later index, which a position-keyed `ifNoneExist` would turn into duplicates.

The lesson, now in the skill and the guide: when a platform appears to lack something this basic, find a working example before designing around the gap.

### Sprint 4 — next

The happy path is complete, so this is hardening:

- **T3.1 access control** — the custom `AccessChecker` plugin. Now the most important outstanding item by a wide margin: every clinical workflow exists, and none of them are authorised.
- **Derive charges from what happened** — walk the encounter's ServiceRequests and MedicationDispenses to propose invoice lines instead of having the cashier type them. Highest-value billing improvement.
- **T3.2 MOH 705**, now that the diagnosis register has real Conditions in it.
- **Clinical review of all four catalogues** before any real use.
- **`EncounterDetails` needs a Nawi container** — it reaches upstream's role matcher and will crash exactly as `EncounterList` did. The CI guard will catch it.

**Parallel track, starting now.** T3.1 — the custom `AccessChecker` plugin. It gates any deployment with real patient data, has the longest lead time, and pulls in new build infrastructure (a derived gateway image), so it should not wait on the clinical sprints.

---

## 9. Definition of done for a production workflow

The original PoC met roughly half of these. The triage and start-visit workflows delivered in Sprints 0–1 meet all twelve; item 13 applies to terminology, which `docs/opd-terminology.md` covers. Every remaining Tier 2 slice should meet all of them.

1. Questionnaire and Mapping seeds in `resources/fhir-seeds`, valid YAML, stable canonical URL.
2. Launch context declared and actually supplied by the launch surface at runtime.
3. All clinical writes and the state transition in **one** transaction Bundle.
4. Repeat submission is safe — conditional create or stable identifier.
5. Standard terminology (LOINC / SNOMED / ICD-10 / UCUM); local code systems explicitly namespaced under `https://emr.nawi.ke/fhir/CodeSystem/`.
6. Generated resources reference both Patient and Encounter.
7. The next stage's queue query is written down and returns the item.
8. Gateway allowlist covers every read, search and write the workflow performs.
9. Role visibility in the menu **and** an enforcement point behind it.
10. Workflow guide in `docs/`, following the structure of `docs/opd-triage-workflow.md`.
11. `bash .claude/skills/beda-workflow/scripts/validate-workflow.sh` passes.
12. Live verification: form renders, `$extract` returns the expected Bundle, resources persist, next queue picks the item up.
13. **Every local substitution documents its extension path** — see §11.

---

## 10. Documentation obligations

A standing requirement from NawiTech: anywhere V1 substitutes a local or simplified implementation for the real thing, the workflow guide must say so *and* say how to change it. A reader six months from now should be able to swap a component without reverse-engineering the seeds.

Each such point gets a short, named block in its `docs/` guide covering:

- **What is local** and why (licensing, no source catalogue, deferred integration).
- **The seam** — the exact file, canonical URL or config key that a replacement plugs into.
- **The swap procedure**, as concrete numbered steps.
- **What does *not* need to change**, so the blast radius is bounded.

The three known cases in V1. The first two are now written up in full:

| Substitution | Seam | Swap procedure |
| --- | --- | --- |
| Local diagnosis codes instead of licensed ICD-10 (**D4**) | Questionnaires reference `answerValueSet` by canonical URL; no inlined `answerOption`. | Written up in **`docs/opd-terminology.md`**, including the HAPI fulltext-search prerequisite that expansion depends on. |
| No M-Pesa reconciliation (**D5**) | Payment is recorded as `PaymentReconciliation` with a payment-method coding. | (a) add the reconciliation service; (b) match on the existing `PaymentReconciliation` identifier; (c) extend the payment-method ValueSet. Invoice and ChargeItem generation are untouched. |
| HAPI-only feature set (**D0**) | Features that require Aidbox (`$query`, `$run`, `$generate-upload-url`) are listed as gaps, not silently absent. | Each gap names the OHS component that would provide it, so the decision is revisitable rather than forgotten. |
| Prebuilt-artifact frontend image | `Dockerfile` consumes a host-produced `build/`; the service sits behind a Compose profile. | Written up in **`docs/frontend-image.md`** — what exists, why it fails locally, and the multi-stage replacement. |

Locally authored lab and drug catalogues (T3.6) follow the same pattern as the first row.

---

## 11. Open questions — resolved

All six answered by NawiTech on 2026-09-09.

| # | Question | Answer | Effect |
| --- | --- | --- | --- |
| 1 | Access control | `fhir-gateway` supports `AccessChecker` plugins, so a **custom role-aware checker will be implemented**. | T3.1 confirmed in scope and starts in parallel. Adds a derived gateway image to Compose and CI. |
| 2 | ICD-10 | **Not licensed.** Use a local code system, easy to configure or swap later. | T1.5 reshaped; swappability becomes a design constraint (§10). |
| 3 | Billing depth | **No M-Pesa reconciliation in V1**, but document the extension point. | D5 closed. T3.3 out of scope, documented only. |
| 4 | Reports | **MOH 705.** | T3.2 scoped to the diagnosis register first. |
| 5 | Catalogues | **No** existing test menu or formulary. | Lab and drug catalogues authored locally (T3.6), same swappable pattern. |
| 6 | Backend | **HAPI is the V1 target**, and V1 scope is what HAPI supports. Unsupported features are documented against the other OHS components. | D0 added. B6 and the Aidbox-only findings in §6 become documented gaps rather than blockers to route around. |
