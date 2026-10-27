# Questionnaire and Mapping seeds

Read this reference when creating or modifying Beda SDC seeds.

## Local locations and shape

Store source resources here:

```text
resources/fhir-seeds/Questionnaire/<id>.yaml
resources/fhir-seeds/Mapping/<id>.yaml
```

Follow an existing seed from this repository before adding fields. The current local convention links a Questionnaire to a Mapping with:

```yaml
mapping:
  - valueReference:
      reference: Mapping/<id>
```

The Mapping convention is:

```yaml
id: <id>
resourceType: Mapping
type: FHIRPath
body:
  "{% assign %}":
    - answer: "{{ %QuestionnaireResponse.answers('answer-link-id') }}"

  resourceType: Bundle
  type: transaction
  entry: []
```

Use the Mapping `type` already supported by the repository's FHIR SDC and extraction service. Do not rename it based solely on newer external examples.

## Clinical context

Declare every resource required for population or extraction in `launchContext`. Common names are case-sensitive:

```yaml
launchContext:
  - name:
      code: Patient
    type:
      - Patient
  - name:
      code: Author
    type:
      - Practitioner
      - Organization
```

Only declare `Encounter` when the launch surface supplies it. Match expressions exactly: `%Patient`, `%Encounter`, and `%Author` are different from lowercase variants.

Use `subjectType` to describe the form's true subject. Keep it consistent with where the action is launched.

## Questionnaire design

- Give every item a stable, descriptive `linkId`.
- Use the correct FHIR Questionnaire item type.
- Mark fields required when the generated FHIR resource would otherwise be invalid or clinically ambiguous.
- Add initial or calculated expressions only when their launch variables are available.
- Preserve the repository's Questionnaire profile and canonical URL convention.
- Do not treat AI-generated forms as clinically approved definitions.

## Extraction design

- Assign repeated expressions once under `{% assign %}`.
- Construct references from launch resources rather than accepting editable reference strings from users.
- Use POST for new resources and PUT/PATCH only when identity and concurrency behavior are understood.
- Include required FHIR properties such as statuses and intent.
- Use `QuestionnaireResponse.authored` for recorded time when appropriate.
- Use UCUM codes for quantities and standard terminology codes when available.
- Keep related writes in one transaction Bundle.
- Consider repeat submission and idempotency. If duplicate clinical records are unsafe, use stable identifiers or conditional transaction requests rather than unconditional POSTs.

### Optional answers

Never emit a resource for a question that may be unanswered — an `Observation` with an absent value is invalid. Make the whole transaction entry conditional instead:

```yaml
    - "{% if %oxygenSaturation.exists() %}":
        request:
          url: /Observation
          method: POST
        resource:
          ...
```

The `{% if %}` key wraps the entry, so everything below it indents one level further than an unconditional entry. An unanswered question then produces no entry at all rather than a malformed one.

### Repeating groups and iteration

The engine iterates. Use it — a form that captures "as many as the patient needs" should never be built from fixed slots.

Two capture syntaxes, and the difference matters:

| Syntax | Returns |
| --- | --- |
| `{{ … }}` | a **single value**. A repeating answer silently collapses to the first. |
| `{[ … ]}` | a **collection**. |

Mark the questionnaire group `repeats: true`, capture it with `{[ ]}`, then loop:

```yaml
  "{% assign %}":
    - rxRows: "{[ %QuestionnaireResponse.repeat(item).where(linkId='prescription') ]}"

  entry:
    - "{% for index, row in %rxRows %}":
        "{% assign %}":
          - medication: "{{ %row.item.where(linkId='medication').answer.valueCoding.first() }}"
        "{% if %medication.exists() %}":
          request:
            url: /MedicationRequest
            method: POST
            ifNoneExist: "identifier=<system>|{{ %visitKey }}-rx-{{ %medication.code }}"
          resource:
            ...
```

Notes that save time:

- `%index` is available inside the loop, for building a unique `fullUrl` per row.
- `{% for %}` also works **inside an array**, to gather every created row into one list — how `DiagnosticReport.result` collects its observations.
- `.sum()` aggregates a column: `…where(linkId='line').item.where(linkId='amount').answer.valueDecimal.sum()`.
- A `Reference` answer yields its id with `.reference.split('/').last()`, which makes a good idempotency key.

**Key rows by content, not by `%index`.** With fixed slots, position was stable. With a repeating group it is not: delete a row, resubmit, and every later row shifts index, so an `%index`-keyed `ifNoneExist` creates duplicates and orphans the originals. Prefer a business key from the row itself — the medication code, the referenced order's id. Fall back to `%index` only where the content genuinely has no natural key (invoice lines, where the same service may legitimately appear twice) and say so in a comment.

**Do not trust a grep for `{% for %}`.** A naive pattern like `\{% *for[^%]*%\}` cannot match `{% for index, row in %rxRows %}`, because `[^%]` stops at the `%` sigil of the variable. That false negative is how this repository ended up with fixed slots in four forms.

### Conditional array elements and conditional references

Both work, and both save carrying ids through launch context.

An array can be built from conditional elements, so an optional item leaves no gap:

```yaml
        result:
          - "{% if %resultTest1.exists() %}":
              reference: "urn:uuid:opd-lab-result-1"
          - "{% if %resultTest2.exists() %}":
              reference: "urn:uuid:opd-lab-result-2"
```

A reference can be written as a search, which the server resolves during the transaction:

```yaml
          authorizingPrescription:
            - reference: "MedicationRequest?identifier=<system>|{{ %visitKey }}-rx-1"
```

Together with conditional PATCH, these mean a mapping rarely needs anything in launch context beyond the patient, the encounter and the author — everything else is addressable by business identifier.

### When a reference is rejected, check the resource type first

FHIR constrains which resource types a reference element may point at, and HAPI enforces it:

```text
HAPI-0931: Invalid reference found at path 'Observation.basedOn'.
Resource type 'DiagnosticReport' is not valid for this path
```

The tempting fix is to find a permissive field — most resources have something typed `Reference(Any)` — and push the link through there. Usually the constraint is telling you the resource is wrong. In this repository a clinician's review of a lab report started as an `Observation` and became a `ClinicalImpression`, whose `supportingInfo` accepts the report, `summary` the note, and `code` the outcome. The mapping got shorter.

Check for a more specific resource type before forcing a link into a general-purpose field.

### PATCH entries

A PATCH entry's `resource` must be a FHIRPath **`Parameters`** body. HAPI rejects a plain resource fragment with `HAPI-0537: Unable to determine PATCH body from request`:

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
                valueCode: triaged
```

This matters when borrowing from upstream: several upstream mappings (`complete-encounter-extract`, `encounter-create-extract`, `pay-invoice-extract`, `cancel-invoice-extract`, `medication-request-extract`) emit the plain-fragment form, which works on Aidbox and fails here. Being `type: FHIRPath` is not sufficient for an upstream mapping to run — check its PATCH entries too.

**Conditional PATCH works.** Addressing by business identifier lets a mapping update a resource it does not hold in launch context, which is usually better than adding a launch variable just to carry an id:

```yaml
    - request:
        method: PATCH
        url: "Task?identifier=<system>|{{ %visitKey }}-triage"
```

### Conditional create

For an entry that must not be duplicated by a resubmitted form, give the resource a business identifier and key `ifNoneExist` on it:

```yaml
    - request:
        url: /Task
        method: POST
        ifNoneExist: "identifier=<system>|{{ %businessKey }}"
      resource:
        identifier:
          - system: <system>
            value: "{{ %businessKey }}"
```

A repeat submission then returns `200 OK` against the existing resource instead of `201 Created` on a new one.

Apply this deliberately, not everywhere. The duplicate that breaks a workflow is a second queue item; repeat clinical observations within a visit are usually legitimate and carry their own timestamps, so deduplicating them loses real data.

Derive the key from something with the right grain. A patient id alone is too coarse (it never allows a second visit); patient plus date works while a workflow is patient-scoped, but the encounter id is the correct key once encounter context exists.

## Two engines evaluate a form

`$populate` runs inside `fhir-sdc`, which talks to HAPI directly (not through the gateway) and resolves `launchContext`, `x-fhir-query` variables, `itemPopulationContext` and `initialExpression`. The browser (`sdc-qrf`) then evaluates `variable`, `calculatedExpression` and `enableWhen` live, and never sees `initialExpression`. Design for both:

- Server data the browser must compute with has to be copied into the response by the server. `opd-billing` populates hidden `price-catalogue` rows and the browser joins each line against them with plain FHIRPath.
- Every `%variable` a browser-evaluated expression uses must be defined where the browser evaluates it (on an item, not the questionnaire root), or fhirpath.js throws on the undefined variable.
- Populate queries bypass the gateway allowlist; browser-side queries (`answerExpression`, `$expand`, page searches) do not.
- The pinned `bedasoftware/fhir-sdc:2.1.0a3` sends the query string through fhirpy with a trailing `?`, so end every `x-fhir-query` with `&_format=json` to absorb it.

`docs/opd-billing-workflow.md` §How the pricing works has the full diagram.

## Reference data seeds

Some seeds are a starting value the application edits afterwards, not the source of truth: today the price list, `resources/fhir-seeds/ChargeItemDefinition/`, edited on `/price-list`. The upload service re-applies the whole bundle on every `docker compose up`, so such a type must be named in the `--create-only` argument of `upload-fhir-bundle` in `docker-compose.yml` (details in [stack-compatibility.md](stack-compatibility.md)). A new reference-data type that is not listed there is a data-loss bug on the first restart.

A form that edits such a resource launches with the resource itself as context: `opd-price-edit` declares `subjectType` and `launchContext` of `ChargeItemDefinition`, supplied by the price-list row, and writes it back with a full `PUT` rebuilt from the launched resource. HAPI's FHIRPath `PATCH` needs an indexed path into nested arrays such as `propertyGroup.priceComponent`, and rebuilding the handful of seeded fields is easier to read and verify.

## Local examples

- `opd-triage` — the canonical small form: patient and encounter context, one transaction, Task hand-off.
- `opd-billing` — repeating line groups priced from reference data. `{% for %}` loops over rows selected by linkId suffix, `ifNoneExist` on a visit key makes re-submission idempotent, and totals are recomputed in the mapping rather than trusted from the form.
- `opd-price-edit` — a non-clinical, resource-scoped edit form (above).
- `patient-create` — `PATCH` of the gateway's patient access `List` with a `Parameters` body, in the same transaction as the create.

Use them for local syntax, not as a universal clinical model.

