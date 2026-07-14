# Testing the demo end to end

Everything below runs against the local stack. Nothing is mocked: every number on
screen is a FHIR query result, and every form submission writes real resources.

---

## 1. Prerequisites

- Docker + Docker Compose
- Node 20+
- **`corepack yarn`, not `yarn`.** On Ubuntu the `yarn` on `$PATH` is usually the one
  from the `cmdtest` package, which fails with `ERROR: There are no scenarios`.
- `127.0.0.1 host.docker.internal` in `/etc/hosts` (Linux). Keycloak issues tokens
  under that hostname and the gateway validates the issuer against it.

---

## 2. Bring the stack up

```bash
git submodule update --init
corepack yarn install
cp contrib/emr-config/config.local.js contrib/emr-config/config.js   # gitignored; the build refuses to run without it

docker compose -f docker-compose.dev.yml up -d   # starts the stack AND seeds it
corepack yarn start                              # http://localhost:3000
```

That is the whole thing — **`up -d` seeds the data itself**. The compose file declares
four one-shot services (`build-fhir-bundle`, `build-fhir-bundle-demo`,
`upload-fhir-bundle`, `upload-fhir-bundle-demo`) that export `resources/fhir-seeds*` to
a transaction bundle and POST it to HAPI once the server is healthy. They run, exit 0,
and stay exited. No separate seed step.

Give it a minute or two on a cold start: HAPI has to come up before the uploaders will
run. When it settles you should have 20 patients, 60 encounters, 8 questionnaires and
8 claims.

`beda-frontend` sits behind a `frontend` profile, so it does **not** start by default.
Its Dockerfile copies a prebuilt `build/` directory rather than building the app, so it
would abort the whole `up` on a fresh clone. For a dev run use the Vite server; to run
the built app in a container, `corepack yarn build` first and then
`docker compose --profile frontend up -d beda-frontend`.

| Service | Port | |
|---|---|---|
| Frontend (Vite) | 3000 | what you log into |
| Keycloak | 8080 | identity |
| HAPI FHIR | 8082 | the FHIR server — query it directly to check the app's claims |
| fhir-sdc | 8083 | `$populate` / `$extract` — turns a filled form into resources |
| **fhir-gateway** | **8084** | **the URL the app actually talks to.** Authorises every request |
| pgweb | 8085 | database browser |

Read at :8082 when you want ground truth. Read at :8084 when you want to know what a
given user is *allowed* to see.

---

## 3. Log in

Pick the **local** provider on the sign-in screen (it is the default on a develop
tier). Password for every account is `password`.

| Username | Person | Workflow |
|---|---|---|
| `clinician` | Dr. Amara Okafor | **1** |
| `triage-nurse` | Lena Torres, RN | **2** |
| `administrator` | Joan Rivera | **3** |
| `cashier` | Marcus Webb | **4** |
| `pharmacist` | David Cho, PharmD | — |
| `patient` | Danielle Coleman | — |

---

## 4. Automated end-to-end run

One command drives all four workflows in a real browser, asserts each outcome against
the FHIR server, and records a video per workflow.

```bash
./scripts/reset-demo-data.sh          # always reset first — see §7
node scripts/demo-e2e.mjs             # all four
node scripts/demo-e2e.mjs 1 3         # only workflows 1 and 3
PACE=1500 node scripts/demo-e2e.mjs   # slower, for watchable video
OUT_DIR=./out node scripts/demo-e2e.mjs
```

Expected: **33/33 checks passed**. Videos default to `~/Downloads/RFI_EHR/`:

```
Workflow1_PatientEncounter_Nawi.webm
Workflow2_MedicationAdministration_Nawi.webm
Workflow3_Administrator_Nawi.webm
Workflow4_Billing_Nawi.webm
clinical-staff-productivity.csv       ← the report the run actually exported
```

Single-purpose smoke scripts, if you want to isolate something:

```bash
node scripts/smoke-ui.mjs           # login + chart + HIE badges
node scripts/smoke-forms.mjs        # all five clinical forms open
node scripts/smoke-visit-note.mjs   # submit a visit note, verify the resources
node scripts/smoke-medications.mjs  # workflow 2
node scripts/smoke-reports.mjs      # workflow 3
node scripts/smoke-billing.mjs      # workflow 4 (RUN_CORRECTION=1 to do the correction)
```

---

## 5. Manual walkthrough

### Workflow 1 — Patient Encounter · log in as `clinician`

1. **Landing.** Patient register.
2. **Look up a patient.** Search `Carroll` → open **Denise Carroll**.
3. **Review history, including outside records.** Five records carry a **CRISP HIE**
   badge — the Harbor View ED encounter, the cellulitis diagnosis, the cephalexin
   prescription, the WBC result, and the foot X-ray. Everything the clinic wrote itself
   is unbadged. Hover a badge to see the source.
   *This is the most important screen in the submission.*
4. **Document the encounter.** *Document visit* on the Encounters card. BP 158/94,
   HR 98, temp 38.1, weight 92, glucose 396.
5. **Prescribe.** *Prescribe* → Metformin 1000 mg. *Administer vaccine* → PCV20.
6. **Refer.** *Refer to specialist* → Dr. Samuel Igwe, Endocrinology, urgent.
7. **Consent.** *Capture consent* → share with Dr. Igwe, permit, 12 months.
8. **Verify it is real:**
   ```bash
   curl -s "http://localhost:8082/fhir/Encounter?subject=Patient/pt-denise-carroll&date=ge2026-07-14" | jq '.entry[].resource.status'
   curl -s "http://localhost:8082/fhir/Observation?subject=Patient/pt-denise-carroll&_sort=-_lastUpdated&_count=6" | jq -r '.entry[].resource.code.text'
   curl -s "http://localhost:8082/fhir/ServiceRequest?subject=Patient/pt-denise-carroll" | jq '.entry[].resource.performer'
   ```

**Not built:** signature capture on the consent. Do not claim it.

### Workflow 2 — Medication Administration · log in as `triage-nurse`

1. **Landing.** *Medications due*.
2. **The orders and their pharmacy status**, all three states on one screen:

   | Medication | Status | Modelled as |
   |---|---|---|
   | Metformin | Order received by pharmacy | `Task` exists, **no** `MedicationDispense` |
   | Insulin glargine | Filled — in transit | `MedicationDispense` `in-progress` |
   | Ceftriaxone | Delivered — available | `MedicationDispense` `completed` + `whenHandedOver` |

   Hover a status for the timestamp and location.

**Not built: documenting an administration without network access.** There is no
offline write queue and we did not fake one. Say so in the voiceover.

### Workflow 3 — Administrator · log in as `administrator`

1. **Landing.** *Reports*.
2. **An existing report** — *Clinic Activity — Current Month*. Its period is fixed by
   the report definition; **there is no search bar**.
3. **An ad hoc report** — *Ad Hoc Report Builder*. Same measures, but the period is
   yours to choose. That contrast is the point.
   - Unfiltered: **58 visits / 20 unique patients**.
   - Set **2026-07-01 → 2026-07-05**: drops to **10 / 10**.
   - The **By clinician** table under the results adds up to the headline.
4. **Cross-check the numbers against the server:**
   ```bash
   curl -s "http://localhost:8082/fhir/Encounter?status=finished&participant:missing=false&date=ge2026-07-01&date=le2026-07-05&_total=accurate&_count=1" | jq .total
   ```
5. **Send it to someone with no account.** *CSV* downloads the file; *Email* opens your
   own mail client, prefilled. Attach the CSV and send. No account is provisioned for
   the recipient, and there is no SMTP service.

### Workflow 4 — Billing · log in as `cashier`

1. **Landing.** Billing dashboard: *Ready to submit* (5, $630) · *Submitted* (3, $496) ·
   **Clearinghouse rejections (3, $496)**.
2. **The rejection report.** Open the rejections queue. Three front-end rejections with
   X12-style codes.
3. **Research the root cause.** Denise's row shows the two dates side by side —
   **our record `1967-03-14`** (red) against the **payer's record `1967-03-04`** (green).
   The claim agrees with our master file: it was assembled correctly, from bad data.
   *Open patient record* jumps straight to her chart — one store, one click.
4. **Correct and resubmit.** Fix the date of birth, give a reason, submit.
5. **Verify the correction was surgical and attributable:**
   ```bash
   curl -s http://localhost:8082/fhir/Patient/pt-denise-carroll | jq '{birthDate, version: .meta.versionId, name, address}'
   curl -s "http://localhost:8082/fhir/Provenance?target=Patient/pt-denise-carroll" | jq '.entry[].resource.reason'
   ```
   The date of birth changes, the version increments, **name and address survive** (it
   is a FHIRPath PATCH, not a destructive overwrite), and a `Provenance` records who
   changed it and why. The rejection queue drops from 3 to 2.

---

## 6. The demo data

20 patients on a Maryland local health department panel — a real one is not uniformly
young, uniformly one ethnicity, or all from one city, and a report built on a cohort
that is will look synthetic to anyone who works in the state.

| | |
|---|---|
| Ages | 11 – 89 |
| Race | 6 OMB categories, carried as US Core `us-core-race` extensions |
| Ethnicity | 3 of 20 Hispanic or Latino (`us-core-ethnicity`) |
| Language | English, Spanish, Korean, Amharic |
| Geography | 9 Maryland counties — Baltimore City, Baltimore, Montgomery, Prince George's, Anne Arundel, Howard, Frederick, Allegany, Wicomico |

Regenerate with `python3 scripts/seed-demo-cohort.py` and `python3 scripts/seed-billing.py`;
both are deterministic.

The clinical narrative: **Denise Carroll**, 59, type 2 diabetes, hypertension, CKD 3a,
sulfa allergy. She attended an **outside** emergency department on 2026-06-21 for
cellulitis and failed a course of oral antibiotics. Her own clinic does not know that —
unless the HIE tells them. That is Workflow 1. Her date of birth was transposed at
registration, so her claims bounce. That is Workflow 4.

---

## 7. Resetting between runs

```bash
./scripts/reset-demo-data.sh
```

Deletes everything created *on top of* the seeds (forms you filled, corrections you
made) and reloads the seed bundles. **Run it before every demo take and before every
`demo-e2e.mjs` run** — workflow 1 adds a visit and workflow 4 edits a master record, so
a second run against a dirty store will not reproduce the same numbers.

Baseline after a reset: **20 patients · 60 encounters · 58 report visits · 3 rejections**.

---

## 8. Things that fail silently

Each of these cost real time. None of them produce an error.

- **The gateway allow-list.** Any resource type the UI reads must be listed in
  `resources/gateway-config/hapi_allowed_queries.json` or the request 403s with no
  useful client-side message. The file is read **at startup**:
  `docker compose restart fhir-gateway` after editing.
- **The access list.** `ACCESS_CHECKER=list` means a patient absent from
  `List/list-patient-1` is invisible to the application — not an error, just missing.
- **Keycloak imports the realm only into an empty database.** Editing
  `beda-emr-realm.json` does nothing until `docker compose down -v`.
- **HAPI no-ops byte-identical updates.** Re-uploading an unchanged seed does not
  rewrite it, so a config change can appear not to have taken when the write was simply
  skipped.
- **HAPI omits `Bundle.total` on paged searches** unless you ask with
  `_total=accurate`. Without it a count tile renders empty.
- **Duplicate copies of a package that publishes a React context** (we hit this with
  `@beda.software/fhir-questionnaire`) mean the provider and the consumer are looking at
  two different context objects. The value reads as `undefined`, the consumer falls back
  to its default, and nothing errors. `resolve.dedupe` in `vite.config.ts` pins it.

---

## 9. Known gaps

| Gap | Status |
|---|---|
| **Workflow 2.e** — administer/document without network access | **Not built.** No offline write queue. State it in the voiceover. |
| Signature capture on the consent | Not built; the widget does not exist. |
| X12 `A7:21:QC` rejection code | **Illustrative — not verified** against the real 277CA code set. A biller on the review panel would notice. Check before recording. |
| Email delivery | `mailto:` + CSV attachment, sent under the user's own identity. There is no SMTP service, by choice. |
