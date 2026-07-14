# Maryland EHR RFI — workflow specification

**Source of truth:** `RFI__EHR_Market_Research_Final.pdf` (issued 2026-07-01, responses due 2026-07-15 12:00 EST).
This document is derived **only** from the PDF's four workflows. Narrative material from `EHR_SAMPLE.md`
is not authoritative and is not used here.

**Scope decision:** all four workflows, **except step 2.e** (document without network access). We have no
offline write queue and will not build one. Video 2 covers 2.a–2.d and stops there.

**Platform:** Nawi EMR — React web app on `@beda.software/emr`, backed by HAPI FHIR R4 + Keycloak +
fhir-gateway + fhir-sdc.

---

## Conventions

We follow beda's existing conventions rather than inventing new ones.

**Seeding.** Resources are YAML, one file per resource, under:
- `resources/fhir-seeds/` — `Questionnaire/` + `Mapping/` (application config; loaded to every environment)
- `resources/fhir-seeds-demo/` — clinical/demo data, grouped by resource type

Both are exported to a transaction Bundle by `fhirsnake` (`--embed-mapping` inlines the `Mapping` into the
`Questionnaire`) and POSTed to HAPI. `watch-fhir-seeds*` hot-reloads on change.

**Write path (no code).** A clinical action = a `Questionnaire` (the form) + a `Mapping` (`type: FHIRPath`,
a template emitting a transaction `Bundle`). The form is launched with `questionnaireAction(title, id)`;
`fhir-sdc` executes `$extract` server-side. **Verified working against HAPI on 2026-07-14** — an extract
created a Patient and ran the FHIRPath-Patch appending it to `List/list-patient-1`.
Template dialect: `resources/fhir-seeds/Mapping/patient-create.yaml`.

> Upstream `contrib/fhir-emr/resources/init-seeds/Mapping/*` targets **Aidbox** and will fail on HAPI
> (`medication: {Reference:…}` instead of `medicationReference`; `{resourceType,id}` references).
> Reuse the **Questionnaire item trees**; rewrite every **Mapping** body against `patient-create.yaml`.

**Screens (little code).** `ResourceListPage` (`src/uberComponents/`) declares a whole page — `getFilters`,
`getSorters`, `getTableColumns`, `getRecordActions` / `getHeaderActions`. Patient chart widgets come from the
dashboard config consumed via `useDashboard()`; extra chart tabs via the `embeddedPages` prop. None of this
requires forking the submodule.

**Access.** fhir-gateway (`ACCESS_CHECKER=list`) enforces authorization. Every resource type the UI reads
must be in `resources/gateway-config/hapi_allowed_queries.json` or it 403s silently, and every patient must
be in `List/list-patient-1` or it is invisible. (Aidbox `AccessPolicy` is not used.)

**Known platform traps.**
- Keycloak imports the realm **only into an empty DB** — realm edits need `docker compose down -v`.
- HAPI **no-ops byte-identical updates** — a re-upload may silently not re-persist changed `meta`.
- HAPI drops `meta.source` unless `store_meta_source_information` is set (now set to `SOURCE_URI`).

---

## Shared demo dataset

One patient across all four workflows, so a reviewer watching in sequence recognises her.

| | |
|---|---|
| Patient | **Denise M. Carroll** · `Patient/pt-denise-carroll` · F, 1967-03-04 · MRN `PLHD-004821` |
| Clinician | **Dr. Amara Okafor** · `Practitioner/prac-okafor` (Keycloak user `clinician`) |
| Nurse | `Practitioner/prac-1002` (Keycloak user `triage-nurse`) |
| Administrator | Keycloak user `administrator` |
| Billing specialist | Keycloak user `cashier` |
| Our facility | `Organization/org-1001` |
| Outside provider | **Harbor View Medical Center** · `Organization/org-harbor-view` |

**Already seeded and verified in HAPI:** 18 patients · 49 encounters · Denise's sulfa allergy, chronic
problem list (T2DM, HTN, CKD) and home meds · a 16-patient filler cohort so reports return credible numbers
(**48 visits / 17 unique patients**, 2026-06-15 → 2026-07-14, split across three clinicians).

**The HIE data (workflow 1.c)** — five resources from the 2026-06-21 Harbor View ED visit, each carrying
`meta.source: https://crisphealth.org/hie` **and** a `meta.tag` of `HIE`:
`Encounter/enc-harborview-ed` · `Condition/cond-denise-cellulitis` · `MedicationRequest/mr-denise-cephalexin`
· `Procedure/proc-denise-foot-xray` · `Observation/obs-denise-wbc`.
Her internal 2026-07-09 lab visit is deliberately **untagged**, so internal and external records sit side by
side in the chart and the badge is legible. The badge keys on **both** `meta.source` and `meta.tag` — HAPI
silently dropped `meta.source` on first write, and a badge keyed on it alone rendered nothing.

---

## Workflow 1 — Patient Encounter

| PDF step | Implementation | Status |
|---|---|---|
| a. Begin from clinician view landing page | Role-based menu, `src/containers/App/layout.tsx` | exists |
| b. Look up an existing patient | `PatientResourceList` | exists |
| c. Review history **incl. outside-provider encounters via HIE** | CRISP-tagged resources + source badge in the chart | **seeded**; badge = build |
| d. Document new encounter | `Questionnaire/clinic-visit-note` | build |
| e. Prescribe medication and/or vaccine | `Questionnaire/prescribe-medication`, `Questionnaire/administer-immunization` | build |
| f. Schedule a referral with a specialist | `Questionnaire/specialist-referral` → `ServiceRequest` | build |
| g. Capture consent to share record with referred clinician | `Questionnaire/data-sharing-consent` → `Consent` | build |
| h. Save/update | SDC `$extract` | exists |
| i. Logout | Keycloak RP-initiated logout | exists |

**Seeds** — `resources/fhir-seeds/{Questionnaire,Mapping}/`:

| pair | emits |
|---|---|
| `clinic-visit-note` | `Encounter` (`status: finished`, class `AMB`, participant = Okafor) + `Condition` + vitals `Observation`s, in one transaction |
| `prescribe-medication` | `MedicationRequest` (`medicationCodeableConcept`) |
| `administer-immunization` | `Immunization` (`status: completed`) |
| `specialist-referral` | `ServiceRequest` (`intent: order`, category `referral`) |
| `data-sharing-consent` | `Consent` (`scope: patient-privacy`, provision actor = referred practitioner) |

`clinic-visit-note` must write `status: finished` — workflow 3's report counts finished encounters, so the
visit documented on camera in video 1 increments the number shown in video 3.

**Code:**
- `src/containers/PatientDetails/types.ts` — add `Encounter`, `ServiceRequest`, `Consent`
- `src/containers/PatientDetails/resourceDataGetters.tsx` — getters + `isHIESourced()` / `withHIEBadge()`
  (wraps `makeRenderer`, so the badge appears in both the chart card **and** the resource drill-down)
- `src/containers/PatientDetails/utils.tsx` — column configs
- `src/containers/PatientDetails/dashboard/index.tsx` — widgets + `questionnaireAction` buttons
- `src/containers/PatientDetails/dashboard/launchContext.ts` — `%Author` launch context (without it,
  mappings write `requester: "Practitioner/"`)

**Honest gap:** no signature capture on the `Consent` — the widget does not exist in beda. Do not claim one.

---

## Workflow 2 — Medication Administration (steps a–d only)

| PDF step | Implementation | Status |
|---|---|---|
| a. Clinician is a nurse | Keycloak `triage-nurse` → `Practitioner/prac-1002` | exists |
| b. Begin from clinician view landing page | Nurse menu → "Medications Due" | build |
| c. View order for medication to be administered | `MedicationRequest` list for the patient | build |
| d. Determine status of ordered medication | Three orders, deliberately in the **three PDF states** | **seed** |
| ~~e. Document in MAR without network access~~ | **OUT OF SCOPE** — no offline write queue | cut |

Step **d** is the whole point of this workflow, and it is answered with seed data alone — the three states the
PDF enumerates, on one screen:

| PDF sub-step | Medication | Modelled as |
|---|---|---|
| d.i — order **received by pharmacy** | Metformin 1000 mg PO BID | `Task` (`code: fulfill`, `status: requested`, focus → the `MedicationRequest`) |
| d.ii — prescription **filled by pharmacy** | Insulin glargine 20 u SC | `MedicationDispense` `status: in-progress`, `whenPrepared` set |
| d.iii — prescription **delivered and available** | Ceftriaxone 1 g IV | `MedicationDispense` `status: completed`, `whenHandedOver` + `destination` set |

**Seeds** (`resources/fhir-seeds-demo/`): 3 × `MedicationRequest`, 3 × `Task`, 2 × `MedicationDispense`,
1 inpatient `Encounter`, `Location/ward-3b`.

**Code:** a "Medications Due" screen via `ResourceListPage` over `MedicationRequest`, with a derived
*pharmacy status* column resolving each order's `Task`/`MedicationDispense`. Nurse menu entry in `layout.tsx`.

**Gateway:** add `Task`, `MedicationDispense`, `Location` to the allow-list.

**Narration must state plainly** that offline administration is not shown. The RFI explicitly permits gaps
("no reward or penalty"). Do not imply an offline capability we do not have.

---

## Workflow 3 — Administrator

| PDF step | Implementation | Status |
|---|---|---|
| a. Begin from an administrator's starting view | Reports entry on the Administrator menu branch only | build |
| b. Select and view an **existing** report | "Clinic Activity — Current Month" (fixed parameters) | build |
| c. Create an **ad hoc** report | Report builder — date range exposed at run time | build |
| d. Send report by email to someone **without access** | CSV export + `mailto:` | build |
| e. Logout | exists | exists |

The PDF's step c is precise, and the report answers it literally:

> *the number of **unique patients seen by clinical staff** during a select time period **AND** the total
> number of **visits completed by clinical staff** over the same period.*

Two real queries — nothing is computed from a page of results:
1. `Encounter?status=finished&participant:missing=false&date=ge{from}&date=le{to}&_summary=count`
   → `Bundle.total` = **total visits** (server-computed).
2. the same search with `_count=500&_elements=subject,participant,period`
   → **unique patients** = distinct `subject.reference`; per-clinician breakdown grouped by `participant.individual`.

`participant:missing=false` is what makes "**by clinical staff**" true: the Harbor View ED encounter has no
staff participant and is correctly excluded from our productivity numbers while still appearing in Denise's
chart. It also keeps the headline count and the breakdown consistent with each other.

**Verified through the gateway (2026-07-14):** 48 visits · 17 unique patients · Okafor 16/16, prac-1000
16/16, prac-1002 11/16.

The PDF also says: *"If such a report is 'out of the box' with your product, show how this person would create
one that is not."* Hence **b** and **c** are deliberately contrasted: the canned report has its parameters
**fixed by the report definition**; the ad hoc report **exposes them at run time**. That distinction is the answer.

If total > fetched, the UI states so on screen rather than quietly under-reporting.

**Code:** new `src/containers/Reports/` — `service.ts`, `index.tsx`, `ClinicActivityReport/`, `AdHocReport/`,
`export.ts` (CSV `Blob` + `mailto:`). Routes in `App/routes.tsx`; menu item on the Administrator branch of
`App/layout.tsx`.

**Email:** the report leaves as a **file**, via the user's own mail client — the recipient needs no account.
No SMTP service. Keep the `mailto:` body to the summary (URLs break past ~2000 chars); the breakdown is in the CSV.

---

## Workflow 4 — Billing

| PDF step | Implementation | Status |
|---|---|---|
| a. Navigate to Billing Dashboard, open daily submission workqueues | `ResourceListPage` over `Claim`, grouped by status | build |
| b. Review Clearinghouse Ack/Rejection Report for **front-end rejections** | `ClaimResponse` with `outcome: error` | **seed** |
| c. Research root cause by cross-referencing claim against the patient's record | Claim → patient chart, one FHIR store, one click | build |
| d. Update the patient's master file to correct an inaccuracy, and resubmit | `patient-edit` questionnaire + `_history` + `Provenance`; resubmit → new `Claim` | build |
| e. Logout | exists | exists |

`Claim`, `ClaimResponse`, and `Coverage` are **standard R4 resources HAPI stores natively**. We do not need a
clearinghouse — we seed the rejection. The RFI asks to *review* a rejection report and *research* it, not to
integrate a real clearinghouse.

**The inaccuracy.** Denise's `Patient.birthDate` is correct in our record (`1967-03-04`). The seeded `Claim`
carries a **subscriber DOB of `1967-03-14`** — a ten-day transposition — and the `ClaimResponse` rejects it:

```
outcome: error
error: A7 / 21 / QC — subscriber date of birth does not match payer eligibility record
```

Step **c** is the moment the product wins: the biller opens the patient record *from inside the claim*, and
`Coverage` shows the payer's DOB. In most EHRs billing and clinical are separate systems and this is a phone
call; here it is one store and one click.

Step **d** uses what beda already has: the `patient-edit` `Questionnaire`, `_history`, and `Provenance` —
a versioned, attributable correction (`Patient` → `_history/2`), then a resubmitted `Claim` with
`related` pointing at the original.

> The 277CA code triplet above is illustrative. **Verify against the real X12 code set before recording** — a
> biller on the review panel will notice a wrong code.

**Seeds** (`resources/fhir-seeds-demo/`): `Coverage/cov-denise` · `Claim/clm-denise-0709` (subscriber DOB
`1967-03-14`) · `ClaimResponse/clmr-denise-0709` (`outcome: error`) · 2–3 more rejected claims so the
workqueue is not a single row.

**Gateway:** add `Claim`, `ClaimResponse`, `Coverage` to the allow-list.

---

## Gateway allow-list — complete delta

Added (workflow 1): `Encounter`, `ServiceRequest`, `Consent` ✅ done
To add (workflow 2): `Task`, `MedicationDispense`, `Location`
To add (workflow 4): `Claim`, `ClaimResponse`, `Coverage`

Each needs its bare path **and** its `/ANY_VALUE` form. `docker compose restart fhir-gateway` after editing —
the file is read at startup only.

---

## Acceptance tests

Robot Framework + Browser library (Playwright-backed), under `tests/`:

```
tests/
  resources/           keywords: login, navigate, chart, forms, reports
  workflow1_patient_encounter.robot
  workflow2_medication_administration.robot
  workflow3_administrator.robot
  workflow4_billing.robot
  api/                 FHIR-level assertions (the resources actually landed)
```

Test cases are named after the PDF steps, so the suite reads as a direct answer to the RFI. Every UI test that
writes a resource is paired with an **API assertion** that the resource exists in HAPI with the right fields —
a green UI test that wrote nothing is worthless.

Coverage: 1.a–1.i · 2.a–2.d · 3.a–3.e · 4.a–4.e. **2.e is not tested — it is not built.**
