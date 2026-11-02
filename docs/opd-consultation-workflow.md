# OPD consultation, laboratory and pharmacy

The clinical middle of the visit: what the clinician records, and how the patient reaches the lab and the pharmacy. Reception and triage are covered in `docs/opd-triage-workflow.md`; terminology in `docs/opd-terminology.md`.

```text
clinician                          lab tech              pharmacist
    │                                  │                      │
    ├─ Start consultation ────────────►│ (if tests ordered)   │
    │  Encounter in-progress           │                      │
    │  Condition + note                ├─ Record results      │
    │  ServiceRequest × n              │  Specimen            │
    │  MedicationRequest × n           │  Observation × n     │
    │  Task consultation completed     │  DiagnosticReport    │
    │                                  │  ServiceRequests done│
    ├─ (if prescribed) ────────────────┼─────────────────────►│
    │                                  │                      ├─ Dispense
    │                                  │                      │  MedicationDispense × n
    │                                  │                      │  MedicationRequests done
```

Lab and pharmacy run **in parallel**, not in sequence. The consultation creates both work items up front, so a patient waiting for results is not blocking their prescription.

## What is included

| File | Purpose |
| --- | --- |
| `resources/fhir-seeds/Questionnaire/opd-consultation.yaml` | Diagnosis, notes, lab orders, prescriptions. |
| `resources/fhir-seeds/Mapping/opd-consultation.yaml` | Clinical writes plus the hand-offs. |
| `resources/fhir-seeds/Questionnaire/opd-lab-results.yaml` | Specimen and results capture. |
| `resources/fhir-seeds/Mapping/opd-lab-results.yaml` | Specimen, Observations, DiagnosticReport, closes the orders. |
| `resources/fhir-seeds/Questionnaire/opd-dispense.yaml` | Dispensing record. |
| `resources/fhir-seeds/Mapping/opd-dispense.yaml` | MedicationDispense, closes the prescriptions. |
| `resources/fhir-seeds/CodeSystem/opd-lab-test.yaml` | Lab test menu — **not clinically reviewed**. |
| `resources/fhir-seeds/CodeSystem/opd-medication.yaml` | Formulary — **not clinically reviewed**. |
| `src/containers/LabQueue/`, `src/containers/PharmacyQueue/` | The two new stations. |

## Resulting data

**Consultation** always writes a `Condition` (encounter-diagnosis, with the clinician's certainty as `verificationStatus`) and an `Observation` carrying the clinical note. It conditionally writes a second `Condition`, up to three `ServiceRequest`s and up to three `MedicationRequest`s.

**Laboratory** writes one `Specimen`, one `Observation` per result, and a `DiagnosticReport` that references the specimen and every result recorded.

**Pharmacy** writes one `MedicationDispense` per dispensed item, each linked to the prescription it satisfies.

### Clinical notes are an Observation, not a DocumentReference

The workflow guide (§4.3) specifies `DocumentReference` for clinical notes. That needs attachment storage, which this stack does not have — Beda's file upload uses the Aidbox-only `$generate-upload-url`. The note is therefore an `Observation` with LOINC `51847-2` (Evaluation + Plan note) and a `valueString`, which is queryable and needs no binary storage.

**Swap procedure** when attachment storage arrives (T3.5): add the `DocumentReference` entry to `Mapping/opd-consultation`, keep writing the Observation for one release so nothing reading it breaks, then retire the Observation entry. Existing notes stay as Observations — this is a forward change, not a migration.

## Repeating groups

Lab orders and prescriptions are **repeating groups**: the clinician adds as many rows as the patient needs. The extraction engine iterates them, so there is no limit.

```yaml
  - linkId: prescription
    type: group
    text: Prescription
    repeats: true
    item:
      - linkId: medication
        ...
```

```yaml
    - rxRows: "{[ %QuestionnaireResponse.repeat(item).where(linkId='prescription') ]}"
    ...
    - "{% for index, row in %rxRows %}":
```

Note `{[ ]}` rather than `{{ }}` — the former captures a collection, the latter collapses to the first value.

These forms originally used three fixed slots, on a mistaken belief that the engine could not iterate. That was wrong and is fixed; verified with four lab orders and five prescriptions in one consultation.

## Idempotency

Everything keys off the **visit key** — the business identifier `opd-start-visit` puts on the Encounter:

| Resource | Identifier |
| --- | --- |
| Condition | `<visit-key>-dx-primary`, `-dx-secondary` |
| ServiceRequest | `<visit-key>-lab-<test code>` |
| MedicationRequest | `<visit-key>-rx-<medication code>` |
| Specimen / DiagnosticReport | `<visit-key>` |
| Lab result Observation | `<visit-key>-<order id>` |
| MedicationDispense | `<visit-key>-<prescription id>` |
| Task | `<visit-key>-lab`, `-pharmacy` |

Keys derive from row **content**, not row position. With a repeating group, deleting a row shifts every later index, so a position-keyed identifier would create duplicates and orphan the originals on resubmit.

Every one uses `ifNoneExist`, so resubmitting any form updates in place. Clinical notes and result observations are the deliberate exception where a second reading is legitimate.

## Two FHIR mechanics worth knowing

**Conditional array elements work.** `DiagnosticReport.result` is built from three conditional entries, so a report with two results gets exactly two references — no dangling placeholder for the unused slot.

**Conditional references work.** HAPI resolves a reference written as a search during the transaction, so a form can link to a resource without carrying its id.

## Lab and pharmacy only offer what was actually ordered

Both downstream forms use `answerExpression` to query the server when the form opens, rather than offering a static catalogue:

| Form | Query | Effect |
| --- | --- | --- |
| Laboratory | `ServiceRequest?encounter={{ %Encounter.id }}&status=active` | Only tests ordered for this visit |
| Pharmacy | `MedicationRequest?encounter={{ %Encounter.id }}&status=active` | Only prescriptions written for this visit |

The answers are **references**, which buys more than a constraint. The lab form previously assumed slot 1 meant order 1; a technician entering results out of order would file the malaria result against the FBC request and close the wrong order — silently, with no error. Selecting the order itself removes the assumption: `Observation.basedOn` points at the request the result answers, and the mapping closes exactly that request.

Verified by filling the slots deliberately out of order: each result linked to its own order and each order closed correctly.

**The trade-off.** A reference answer carries no code. The `Observation` and `MedicationDispense` hold the display text and point at the order, which carries the coding. Correct normalisation, but a report wanting the code must follow the link.

## Scope boundaries

1. ~~**Clinician review after results is not modelled.**~~ **Closed.** The lab now raises a `review` work item, and the clinician's queue lists `consultation` and `review` together. Review also prescribes, so definitive treatment can be written once results are known — see *Prescribing at review, and why billing is held* in `docs/opd-billing-workflow.md`.
2. **Billing is not wired.** No station creates a billing work item, so `Encounter.status` stays `in-progress` and never reaches `finished`. That is T2.6.
3. **No prescribing safety checks.** The formulary carries no strengths, forms, interactions or contraindications, and nothing checks against `AllergyIntolerance`. The workflow guide's "check for drug interactions" (§4.5) is unimplemented.
4. **Neither catalogue has been clinically reviewed.** Both need sign-off — the lab menu from a laboratory lead, the formulary from a pharmacist.
5. **Lab results are free text.** `valueString` rather than typed quantities with units and reference ranges, so results are not machine-comparable and cannot drive trend charts or abnormal-flagging beyond the manual interpretation field.
