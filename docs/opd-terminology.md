# OPD terminology

Diagnosis coding for outpatient consultations, and how to replace it.

## What is local, and why

The workflow guide (§4.3) requires ICD-10 coding because insurers need it on claims. **ICD-10 is not licensed for this deployment** (NawiTech, 2026-09-09), and the target clinic has no existing test menu or formulary to seed from either. So all three catalogues are authored locally:

| Catalogue | Status | Seed |
| --- | --- | --- |
| Diagnoses | 30 concepts, **not clinically reviewed** | `resources/fhir-seeds/CodeSystem/opd-diagnosis.yaml` |
| Lab test menu | 15 concepts, **not clinically reviewed** | `resources/fhir-seeds/CodeSystem/opd-lab-test.yaml` |
| Drug formulary | 25 concepts, **not clinically reviewed** | `resources/fhir-seeds/CodeSystem/opd-medication.yaml` |
| Price list | 46 `ChargeItemDefinition`s, **placeholder tariff** | `resources/fhir-seeds/ChargeItemDefinition/` — one per priced code; see `docs/opd-billing-workflow.md` |

The diagnosis list is a starting set for a Kenyan private outpatient clinic. It is a placeholder for a clinician to sign off, not an approved definition.

## The seam

```text
Questionnaire item
  └─ answerValueSet: https://emr.nawi.ke/fhir/ValueSet/opd-diagnosis
                     └─ compose.include.system: https://emr.nawi.ke/fhir/CodeSystem/opd-diagnosis
```

**Questionnaires bind by ValueSet canonical URL and never inline `answerOption`.** That single rule is what makes substitution cheap: the questionnaire names a ValueSet, the ValueSet names a CodeSystem, and only the innermost link changes.

## Swap procedure

To move to licensed ICD-10, or to a facility-supplied catalogue:

1. Seed the replacement CodeSystem under `resources/fhir-seeds/CodeSystem/`.
2. Repoint `compose.include.system` in `resources/fhir-seeds/ValueSet/opd-diagnosis.yaml` at the new canonical URL. Keep the **ValueSet's own** `url` unchanged — that is what questionnaires reference.
3. Re-run the seed watcher (see the caveat below) or restart the stack.
4. Confirm: `curl 'http://localhost:8082/fhir/ValueSet/opd-diagnosis/$expand'` returns the new concepts.

**What does not change:** no questionnaire, no mapping, and no application code. Existing `Condition` resources keep the codes they were recorded with — this is a forward change, not a migration. If historical records must be re-coded, that is a separate exercise and needs a concept map.

## The frontend must expand against *this* server

`src/services/expand.ts` backs every `answerValueSet` control. It must point at this deployment's own FHIR server, because the catalogues are local: `https://emr.nawi.ke/fhir/ValueSet/opd-diagnosis` exists nowhere else, so no external terminology server can resolve it.

It originally pointed at `https://tx.dev.hl7.org.au`, inherited from the Beda AU-core demo. The failure mode was silent — the control rendered, the dropdown stayed empty, and nothing logged an error. If a binding ever "loads nothing", check this file first.

Expansion now goes through Beda's `service`, so it carries the user's bearer token and passes through the FHIR gateway like every other call. `ValueSet/$expand` and `ValueSet/ANY_VALUE/$expand` are both on the gateway allowlist.

**Adding an external terminology server** (licensed ICD-10, SNOMED, LOINC) is a branch in that one function: keep local canonicals on the local server and route other canonicals externally. Do not move everything off the local server — the local catalogues would stop resolving.

## Requirements this depends on

### HAPI must have fulltext search enabled

`$expand` runs on the Hibernate Search index. Without it, expansion fails with `HSEARCH800001: Hibernate Search was not initialized`, and the questionnaire control silently offers no options. `resources/hapi-config/application.yaml` enables it:

```yaml
hapi:
  fhir:
    fulltext_search_enabled: true
spring:
  jpa:
    properties:
      hibernate.search.enabled: true
      hibernate.search.backend.type: lucene
      hibernate.search.backend.analysis.configurer: ca.uhn.fhir.jpa.search.HapiHSearchAnalysisConfigurers$HapiLuceneAnalysisConfigurer
      hibernate.search.backend.lucene_version: lucene_current
      hibernate.search.backend.directory.type: local-filesystem
      hibernate.search.backend.directory.root: /tmp/lucenefiles
```

The `analysis.configurer` line is not optional: without it HAPI fails to start with `HSEARCH000353: Unknown analyzer: 'autocompleteWordEdgeAnalyzer'` and restarts in a loop.

This block was documented but missing from the committed `application.yaml` until 2026-10-27, so a database seeded before then has unindexed concepts and ValueSets whose scheduled pre-expansion is recorded as failed. Rebuild the index once (seconds at this size) and reset any failed ValueSet; no volume recreation is needed:

```sh
curl -s -X POST http://localhost:8082/fhir/\$reindex-terminology -H 'Content-Type: application/fhir+json' -d '{"resourceType":"Parameters"}'
curl -s -X POST http://localhost:8082/fhir/ValueSet/opd-diagnosis/\$invalidate-expansion
```

`$expand` works immediately afterwards, with and without `filter`; the scheduled task pre-expands the ValueSets later.

The index root is inside the container and is not persisted, so it rebuilds on start. That is fine for a catalogue of this size; revisit if the terminology grows.

### Empty expansions are usually stale, not broken

Two failure modes look identical from the UI and are not:

- **`$lookup` works, `$expand` returns nothing.** The concepts are stored but the index is not built. Check `CodeSystem/$lookup` first — it is the fastest way to tell the two apart.
- **A pre-expansion that failed stays failed.** HAPI persists the outcome of the scheduled pre-expansion, including a failure, and does not retry. The `valueset-expansion-message` extension in the `$expand` response's `meta` says `FAILED_TO_EXPAND`. Fix the cause (usually the index: `$reindex-terminology` above), then `$invalidate-expansion` on that ValueSet.

### New seed directories need the watcher restarted

`watch-fhir-seeds` only inotifies directories that existed when it started, and only uploads on change. Adding `CodeSystem/` and `ValueSet/` therefore required:

```sh
docker compose -f docker-compose.dev.yml restart watch-fhir-seeds
touch resources/fhir-seeds/CodeSystem/*.yaml resources/fhir-seeds/ValueSet/*.yaml
```

A full `docker compose up` has no such problem — `build-fhir-bundle` walks the whole tree.

## Open

- Clinical review and sign-off of the 30 diagnosis concepts.
- Lab test menu (workflow guide §4.4 lists the common Kenyan tests) and drug formulary, on this same pattern — tracked as T3.6.
- Whether insurers will accept local codes on claims in the interim, or whether ICD-10 licensing must be resolved before go-live. This is a commercial question, not a technical one.
