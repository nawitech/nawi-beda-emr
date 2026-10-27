# Results review and billing

The close of the visit: the clinician reads the laboratory results, the cashier invoices and takes payment, and the encounter finishes. Earlier stages are in `docs/opd-triage-workflow.md` and `docs/opd-consultation-workflow.md`.

```text
lab tech          clinician                     cashier
    │                 │                            │
    ├─ results ──────►│                            │
    │                 ├─ Review results            │
    │                 │  ClinicalImpression        │
    │                 │  revised Condition (maybe) │
    │                 ├───────────────────────────►│
    │                                              ├─ Take payment
pharmacist ───────────────────────────────────────►│  ChargeItem × n
    ├─ dispense ──────────────────────────────────►│  Invoice
                                                   │  PaymentReconciliation
                                                   │  Encounter → finished
```

## Who creates the billing work item

This is the only genuinely awkward piece of routing in the system, because laboratory and pharmacy run **in parallel** and a mapping cannot ask "is everything else finished yet?" — the template engine has no aggregation.

The rule, spread across three mappings:

| Situation | Who sets `<visit-key>-billing` | To |
| --- | --- | --- |
| Consultation ordered nothing | The consultation itself — there is no downstream station | `ready` |
| Laboratory work happened, no prescription at review | The clinician's **review**, once results are read | `ready` |
| Prescriptions were written | The **pharmacy**, once dispensed | `ready` |
| Review prescribes | The **review** parks it, the pharmacy releases it | `on-hold` → `ready` |

**Known gap.** When the laboratory and pharmacy branches both run, the patient reaches the cashier as soon as *one* completes. A patient could still be billed while the other branch is outstanding. The workflow guide's §5 cashier filter is "services complete", which this does not fully express.

Fixing it properly needs a way to ask "are all sibling Tasks for this visit complete?" — which is aggregation, and therefore not something a mapping can do. The realistic options are a small server-side hook, or having the cashier's queue filter on a computed flag rather than Task existence. Deliberately left open rather than approximated.

The one case that *is* closed is the review-prescribing one below, because there the ordering is known locally: the station writing the prescription is the same station that would otherwise have released billing.

## The review

The clinician's queue lists **two** station codes, `consultation` and `review`, in one worklist. They are the same person doing the same job at different points in the visit, and a separate menu item would only make one easier to forget. The Stage column distinguishes them and each row launches its own form.

The review records a **`ClinicalImpression`**, not an Observation. The first attempt used an Observation with `basedOn` pointing at the report, and HAPI rejected it:

```text
HAPI-0931: Invalid reference found at path 'Observation.basedOn'.
Resource type 'DiagnosticReport' is not valid for this path
```

R4 restricts `Observation.basedOn` to order-shaped resources, and `derivedFrom` does not accept `DiagnosticReport` either. `ClinicalImpression` is the resource for "a clinician assessed this and concluded that": `supportingInfo` takes the report, `summary` takes the note, `code` takes the outcome. Reaching for the right resource beat bending `Observation` into the shape.

**A revised diagnosis is a new Condition, not an edit.** The provisional diagnosis from the consultation stays exactly as it was, and the revision is written as a second, `confirmed` Condition. The record should show what was thought at the time, not be rewritten once the answer is known.

### Prescribing at review, and why billing is held

The commonest OPD shape is empiric treatment at consultation, labs to confirm, then the real
prescription once the answer is known. Review originally could not prescribe at all, so a
clinician looking at a positive result had to have prescribed blind earlier, or not at all.
`opd-review` now carries the same repeating **Prescription** group as `opd-consultation` —
added to it, not moved from it, since empiric treatment is still legitimate.

Two mechanics make it safe, and both are easy to get wrong:

**The pharmacy work item is reopened with a conditional `PUT`, not `POST … ifNoneExist`.** A
visit gets one pharmacy work item, so the transition has to cover three states: none yet, one
still waiting, and one already `completed` because the patient collected their consultation
drugs an hour ago. `ifNoneExist` matches that completed item and creates nothing — the
prescription would exist and never be dispensed, and nobody would find out until a patient went
home without their drugs. A conditional `PUT` upserts: it creates the item or reopens it to
`ready`. The identifier is unchanged, so `opd-dispense` completes it with no change there.

**Billing is parked at `on-hold`, not simply left uncreated.** Pharmacy may already have set
billing `ready` before the results came back, and taking payment then would send the patient
home short of the drugs just prescribed. The queues filter `status=ready`, so `on-hold` takes
the visit off the cashier's list; `opd-dispense` releases it with a conditional `PUT` of its
own. That `PUT` replaced an `ifNoneExist`, which would have matched the held item and left it
held forever.

New orders are keyed `<visit-key>-rx-review-<code>` rather than `<visit-key>-rx-<code>`, so
prescribing the same drug at review as at consultation creates a second, separate order instead
of colliding with the first under `ifNoneExist`.

## The price list

Every billable item has a price, held as a `ChargeItemDefinition` — one per code across the
three catalogues, seeded under `resources/fhir-seeds/ChargeItemDefinition/`:

| Catalogue | Code system | Seed id pattern | Count |
| --- | --- | --- | --- |
| Services (consultation, follow-up, registration, procedure, injection, dressing) | `opd-billable-service` | `opd-price-service-<code>` | 6 |
| Laboratory tests | `opd-lab-test` | `opd-price-lab-<code>` | 15 |
| Formulary, per unit dispensed | `opd-medication` | `opd-price-drug-<code>` | 25 |

Each definition carries the coding it prices and one `propertyGroup.priceComponent` of type
`base` in KES. The amounts are a **placeholder tariff, not reviewed against the clinic's**:
they exist so the workflow is real end to end, and they are expected to change.

`laboratory`, `medication` and `other` in the service catalogue are deliberately unpriced —
they are categories, and the cashier types an amount when one is used.

**Maintaining it.** Administrators have a **Price list** page (`/price-list`,
`src/containers/PriceListResourceList`) listing every definition with an **Edit price**
action (`Questionnaire/opd-price-edit`). The edit is a `PUT` of the definition, and the
billing form reads the list when it opens, so a change is live for the next invoice with no
seed rebuild. Retiring a definition (`status: retired`) takes it off the form's price list
without touching the ChargeItems that already point at it. The cashier sees the same page
read-only. There is no "add" action yet; a new billable code is a new seed (see §Next).

**Edits survive restarts.** The Compose seed upload runs on every `up` and would otherwise
`PUT` the seed tariff back over every edited price. `ChargeItemDefinition` is therefore
create-only in `upload-fhir-bundle` (`scripts/upload-fhir-bundle.py`, `--create-only`): a
definition is seeded when its id is absent and never touched again. The flip side is that
changing a seed file does not change a live server's price — edit it on the page, or delete
the definition and restart to reseed it. In development the watcher still `PUT`s on file
change. Verified 2026-10-27: an edited price survived two `docker compose up -d` runs while
the 21 questionnaire and terminology entries were re-applied.

## The invoice

The form **proposes the invoice from what happened in the visit**, priced from the list:

| Line group | Source | Quantity |
| --- | --- | --- |
| Consultation | One line per visit. `Encounter.type` picks the fee: `follow-up` or `consultation`. | 1 |
| Laboratory | One line per `ServiceRequest` for the encounter, `active` or `completed`. | 1 |
| Medication | One line per `completed` `MedicationDispense`, coded from its prescription via `_include`. | Units dispensed |
| Other services | Added by the cashier: procedures, injections, dressings, registration. | Typed |

Every line shows **unit price × quantity = line total**, and the form keeps a live
**subtotal**, an optional **discount or waiver** with a reason, the **total due**, and after
the amount paid is entered, the **balance outstanding**. Unit prices default to the list
price and stay editable; clearing one restores the list price. The cashier can delete a
proposed line and add any number of others.

### How the pricing works

Two engines evaluate this form and they see different extensions. Getting a form like this
wrong is easy, so the mechanism is spelled out here and in comments at the top of
`Questionnaire/opd-billing.yaml`.

```text
$populate  (fhir-sdc, talks to HAPI directly)          browser  (sdc-qrf)
──────────────────────────────────────────────         ─────────────────────────────────────
variable  priceList  = ChargeItemDefinition?…          variable per row:
          labOrders  = ServiceRequest?encounter=…         rowKey   = system|code of the row
          dispenses  = MedicationDispense?context=…        priceRow = hidden catalogue row
itemPopulationContext → one row per order/dispense                   whose key = rowKey
initialExpression    → code, display, quantity            listPrice, lineTotal
                     → HIDDEN price-catalogue rows      calculatedExpression:
                       (key, amount, definition url)      unit price ← listPrice (editable)
                                                          line total, subtotal, total due
```

- The server fills the rows and copies the **active price list into hidden rows of the
  response** (`price-catalogue`). The browser never calls the server to price anything; it
  joins each row's `system|code` against those hidden rows with plain FHIRPath, so prices
  update live as rows change.
- Every `%variable` must be defined in **both** engines, because fhirpath.js throws on an
  undefined one and the browser only resolves *item-level* variables. That is why the three
  queries live on the wrapper group `invoice`, not on the questionnaire root.
- Only the medication group's population context is **named** (`dispense`): its rows have to
  reach back into the bundle for the prescription that carries the drug code, because the
  dispense record only has the name. A named context is also evaluated in the browser, which
  is harmless once `%dispenses` is defined there.
- Every populate query ends in `&_format=json`. The pinned `bedasoftware/fhir-sdc:2.1.0a3`
  passes the whole query string to fhirpy as a path, and fhirpy appends `?` for its empty
  params, so the last parameter reaches HAPI with a stray `?`: `_count=200?` is rejected
  (`HAPI-0375`), `_format=json?` is not. Later fhir-sdc tags (2.2+) split the query
  properly, and the suffix stays harmless after a bump.
- The four line groups share a child naming convention — `<prefix>-code`, `-quantity`,
  `-unit-price`, `-line-total`, `-list-price`, `-price-definition` — and the mapping selects
  rows by **linkId suffix**. A new kind of line is a new group that follows the convention;
  the mapping does not change.

### What the mapping writes

One `ChargeItem` per priced row, `status: billed`, with `quantity`, `priceOverride` set to
the line total, and `definitionCanonical` pointing at the price-list entry the amount came
from — that link is what makes an invoice auditable against the tariff. When the cashier
changed a unit price, or priced an item that has no list price, `overrideReason` says so and
quotes the list price.

The `Invoice` carries a `lineItem` per charge with its base `priceComponent`, a
`totalPriceComponent` of the subtotal plus the discount when there is one, `totalGross`
(the charges) and `totalNet` (what is owed after discount). Its status is `balanced` when
the amount paid covers the total and `issued` otherwise — a part-payment leaves the balance
visible as `totalNet` minus the `PaymentReconciliation` amount.

Totals are **recomputed in the mapping from the rows**; the live fields on the form are a
display, not the source of truth, so a stale number on screen can never change what is
invoiced.

Charge identifiers key on row position rather than on the service code, because the same
service can legitimately appear twice on one invoice — two medication lines, say. That is
the one place in the system where a positional key is the right answer.

## Payment is recorded, not reconciled

`PaymentReconciliation` captures the amount, the method and a reference the cashier types (an M-Pesa code, say). **Nothing is integrated.** No request reaches Safaricom, no insurer is contacted, and nothing verifies that the money arrived. The cashier asserts what was received, exactly as a paper receipt book would.

**What is local, and why:** M-Pesa, SHIF and private insurer integration are out of V1 scope by decision (D5), not oversight.

**The seam:** payment is a `PaymentReconciliation` carrying a `paymentIdentifier` and a method coding from `ValueSet/opd-payment-method`.

**Swap procedure:** (a) add the reconciliation service; (b) match incoming confirmations against the existing `paymentIdentifier`; (c) set `status` from `active` to reflect the verified state. Invoice and ChargeItem generation are untouched, and historical payments stay as asserted records.

**What does not change:** the billing form, the invoice structure, and the encounter transition.

## Closing the encounter

Billing is the **only** station that moves `Encounter.status` to `finished`. That makes the question "is this visit over?" answerable from one field, and it means an unbilled visit stays visibly open.

## Scope boundaries

1. **"Services complete" is not enforced** — see the gap above.
2. **The tariff is a placeholder.** Every price is a locally authored guess, not the clinic's. Review on the Price list page before go-live.
3. **No insurance claim.** `Claim` is not generated even when the patient has `Coverage`; the cashier records the payment method as insurance and nothing more. Workflow guide §4.6 step 9 is unimplemented.
4. **No receipt.** Nothing renders or prints a document for the patient.
5. **No "add price" action.** A billable code that is not in a catalogue needs a seed, not a click. Registration is not auto-detected either — it is an "Other services" line the cashier adds for a new patient.
6. **Catalogue prices are per unit dispensed**, and the formulary carries no pack sizes or strengths, so a "unit" is whatever the pharmacist counted.
7. **The browser pricing path was verified by emulation, not by clicking.** `$populate` and `$extract` were run against the live dev stack (2026-10-27); the in-browser `variable`/`calculatedExpression` step was exercised with the same fhirpath.js the app bundles, but not through the rendered form. The first UI pass should watch the unit prices fill and the subtotal move.

## Verifying the pricing end to end

Static checks (`validate-workflow.sh`) prove the YAML parses and the app compiles. They do
not prove populate or extraction. Steps 1, 2 and 4 below were run against the dev stack on
2026-10-27 with a synthetic visit (consultation, two lab orders, one dispense of 10 units,
one added dressing line, a 100 KES discount and a 2 000 KES part-payment): populate produced
46 catalogue rows and every expected line; extraction wrote five `billed` ChargeItems each
carrying `definitionCanonical`, an `issued` Invoice with gross 2 600 and net 2 500, the
payment, the closed Encounter and the completed Task; a second submit changed nothing.
On a running dev stack:

1. Seeds. The `ChargeItemDefinition/` directory is new, so the watcher does not see it until
   restarted (`docs/developer-guide.md` §7.1); a full `docker compose up` bundles it. Then:

   ```sh
   curl -s 'http://localhost:8082/fhir/ChargeItemDefinition?status=active&_summary=count' | python3 -m json.tool
   curl -s 'http://localhost:8082/fhir/Questionnaire/opd-billing' | python3 -c 'import json,sys; q=json.load(sys.stdin); print([e["url"].rsplit("/",1)[1] for e in q["item"][0]["extension"]])'
   ```

   Expect 46 definitions, and `variable` extensions on the first item.

2. Populate, with a visit that has lab orders and a dispense:

   ```sh
   curl -s -X POST http://localhost:8083/Questionnaire/\$populate -H 'Content-Type: application/json' -d '{
     "resourceType": "Parameters", "parameter": [
       {"name": "questionnaire", "resource": <the Questionnaire JSON>},
       {"name": "context", "part": [{"name": "name", "valueString": "Encounter"}, {"name": "content", "valueReference": {"reference": "Encounter/<id>"}}]},
       {"name": "context", "part": [{"name": "name", "valueString": "Patient"},   {"name": "content", "valueReference": {"reference": "Patient/<id>"}}]},
       {"name": "context", "part": [{"name": "name", "valueString": "Author"},    {"name": "content", "valueReference": {"reference": "Practitioner/prac-1005"}}]}
     ]}'
   ```

   Expect a `price-catalogue` row per definition, one `lab-line` per order with `lab-code`
   set, one `medication-line` per dispense with `medication-code` set, and
   `consultation-code` matching the visit type.

3. In the app as `cashier`: open the queue item, confirm unit prices filled, change a
   quantity and watch the line total and subtotal move, enter a discount and an amount paid,
   submit.

4. After submit:

   ```sh
   curl -s 'http://localhost:8082/fhir/ChargeItem?context=Encounter/<id>' | python3 -m json.tool | grep -E '"definitionCanonical"|"overrideReason"|"value"'
   curl -s 'http://localhost:8082/fhir/Invoice?identifier=<visit-key>' | python3 -m json.tool | grep -E '"status"|"totalGross"|"totalNet"' -A2
   ```
