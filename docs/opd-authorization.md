# Authorization

Who is allowed to do what, why none of it is enforced today, and what it would take to fix.

Written to be readable without prior FHIR or Beda knowledge. If you are new, read §1–§3 and stop; the rest is for whoever implements the fix.

---

## 1. Authentication and authorization are different things

Two questions that are easy to conflate:

- **Authentication** — *who are you?* Answered by Keycloak. You log in, Keycloak gives the browser a signed token, and every request carries it.
- **Authorization** — *are you allowed to do this?* A separate question, answered separately.

This system answers the first question well and the second one barely at all. A valid token proves you are the pharmacist. It does not stop you writing a diagnosis.

A useful way to hold it: authentication is the door, authorization is what you may touch once inside. We have a good door.

---

## 2. What actually happens when the browser makes a request

Every FHIR call from the app goes through `fhir-gateway` before reaching HAPI. Three checks run:

```text
   browser
      │  GET /fhir/Condition?patient=123      Authorization: Bearer eyJ…
      ▼
 ┌─────────────────────────────────────────────────────┐
 │ fhir-gateway                                        │
 │                                                     │
 │  1. Is the token valid and from our Keycloak?       │  ← authentication
 │  2. Is this path on the allowlist?                  │  ← coarse routing
 │  3. ListAccessChecker: is this patient in the       │  ← patient scope
 │     List named by the token's patient_list claim?   │
 └─────────────────────────────────────────────────────┘
      │  all three pass
      ▼
   HAPI FHIR
```

**The user's role is never consulted.** Not in step 1, not in 2, not in 3. Keycloak puts `realm_access.roles` in the token and the gateway ignores it. The role is read only by the *frontend*, to decide which menu items to draw.

### Check 2 in more detail

`resources/gateway-config/hapi_allowed_queries.json` lists permitted request shapes:

```json
{ "_comment": "Patient — listing", "path": "Patient",
  "queryParams": { "_sort": "ANY_VALUE" },
  "allowExtraParams": true, "allParamsRequired": true }
```

This is **routing, not permission**. It says "a request of this shape may proceed", not "this user may do this". Every authenticated user gets the same answer.

### Check 3, and the thing people miss

`ACCESS_CHECKER=list` means each token carries a `patient_list` claim naming a FHIR `List` resource, and the checker allows access to the patient compartment of the patients in it.

**An allowlisted query bypasses this check.** That is the allowlist's designed purpose — queries that should be permitted regardless of patient context. It is why `Questionnaire` reads work at all, since a questionnaire belongs to no patient.

But it cuts both ways. `Patient?_sort=…` is allowlisted, so **any authenticated user can list every patient**, whatever their `patient_list` claim says.

---

## 3. What this means in practice

Concretely, today:

| Someone could… | Stopped by? |
| --- | --- |
| Pharmacist writes a diagnosis (`POST /Condition`) | No |
| Receptionist writes a prescription (`POST /MedicationRequest`) | No |
| Lab technician marks an invoice paid | No |
| Any authenticated user lists every patient | No |
| Any authenticated user reads any clinical record | No |
| Someone with no token does anything | **Yes** — the one thing that works |

Hiding a menu item does not prevent the request. Anyone who opens the browser console, or curls the gateway with their own token, has the same access as every other logged-in user.

This is acceptable for a demo on synthetic data. It is not acceptable with real patients, and it is the single largest gap in the system.

---

## 4. How default Beda does it

Beda EMR targets **Aidbox**, whose authorization model is the `AccessPolicy` resource. Beda ships eight of them in `contrib/fhir-emr/resources/init-seeds/AccessPolicy/`. Here is one in full:

```yaml
id: practitioner-policy
resourceType: AccessPolicy
engine: allow
roleName: practitioner
```

`engine: allow` means **permit everything**. Five of the eight follow this pattern, one per role. Two scope an anonymous or patient-questionnaire client. Exactly one restricts anything:

```yaml
id: auth-token
engine: matcho
matcho:
  uri: /auth/token
  request-method: post
resourceType: AccessPolicy
```

So default Beda is: *authenticated, and holds a role → do anything.* The role shapes the UI and scopes queries; it does not gate access. That is why `EncounterList` calls `matchCurrentUserRole` to choose **search parameters**, not to decide permission.

**Beda's Developers Guide contains no access-control page.** Its sections are EMR component, Clinical context, Resource detail page, Resource list page, Questionnaire actions, ViewChart and Dashboard. There is no published recommendation to follow — not an oversight on our part, simply absent.

The practical consequence: *"just use Beda's authorization"* is not an available option. There isn't one to adopt.

---

## 5. What our gateway offers

The gateway announces its options at startup:

```text
INFO com.google.fhir.gateway.FhirProxyServer
  List of registered access-checker factories: [list, patient]
```

Two checkers, both **patient-compartment**:

| Checker | Answers |
| --- | --- |
| `list` | Which patients may this token touch? (via a `List` resource) |
| `patient` | Which patient is this token for? (SMART-style, single patient) |

Both answer *which patients*. Neither answers *which operations*. No combination of them expresses "a pharmacist may not write a Condition", because neither has any notion of the user's role.

---

## 6. The permission matrix we actually need

Two sources. The OPD workflow guide §2 states the intent; the workflows we built show what each role genuinely does. The table below is derived from the mappings — it is what the system would break without.

### What each role writes

| Role | Creates | Updates |
| --- | --- | --- |
| **Receptionist** | Patient, Coverage, Encounter, Task | List *(access list)* |
| **Triage Nurse** | Observation, Task | Encounter, Task |
| **Clinician** | Condition, Observation, ServiceRequest, MedicationRequest, ClinicalImpression, Task | Encounter, Task |
| **Lab Technician** | Specimen, Observation, DiagnosticReport, Task | ServiceRequest, Task |
| **Pharmacist** | MedicationDispense, Task | MedicationRequest, Task |
| **Cashier** | ChargeItem, Invoice, PaymentReconciliation | Encounter, Task |
| **Administrator** | Practitioner, PractitionerRole, Organization, Location, HealthcareService | all master data |
| **Patient** | *(nothing)* | *(nothing)* |

### What each role reads

| Role | Reads |
| --- | --- |
| Receptionist | Patient, Coverage, Encounter, Appointment, Practitioner, Task |
| Triage Nurse | Patient, Encounter, Observation, Task |
| Clinician | all clinical resources for patients in scope |
| Lab Technician | Patient, Encounter, ServiceRequest, Specimen, Observation, DiagnosticReport, Task |
| Pharmacist | Patient, Encounter, MedicationRequest, MedicationDispense, Task |
| Cashier | Patient, Encounter, Coverage, ChargeItem, Invoice, PaymentReconciliation, Task |
| Administrator | everything |
| Patient | their own record only |

### Three rules that are not a simple resource-type grid

The matrix above is necessary but not sufficient. Three constraints need expressing too:

1. **Everyone needs `Task`.** Every role creates and completes Tasks — that is how the workflow moves. `Task` cannot simply be restricted by role; it needs restricting by `Task.code`. A pharmacist may complete a `pharmacy` Task, not a `consultation` one.
2. **Reads are patient-scoped as well as role-scoped.** A clinician may read Conditions, but only for patients at their facility. That is what the `list` checker does today, and a replacement must keep doing it.
3. **The Receptionist writes to the access List.** Registration adds the new patient to `List/list-patient-1`, which is the thing controlling everyone's access. That is a privileged write and deserves narrower treatment than "receptionists may update Lists".

---

## 6b. What the client actually enforces today

The plugin in §9 does not exist yet, so it is worth being precise about what the application
*does* do — and, more importantly, what that is worth.

Three surfaces, all in the browser:

| Surface | File | Effect |
| --- | --- | --- |
| Sidebar | `src/containers/App/layout.tsx` | Each role sees its own station's queue first, then the pages it needs |
| Routes | `src/containers/App/routes.tsx` | Only that role's routes are mounted; `*` redirects to its first menu entry |
| Record actions | `src/containers/PatientResourceList/index.tsx` | `Start visit` / `Add patient` / `Edit` are reception + admin; `Delete patients` is admin only |

Routes are gated separately from the menu on purpose. Hiding a menu entry is not gating: a
triage nurse who types `/queue/billing` must not land on the billing form either. Because the
route is never mounted for that role, they are redirected to their own queue instead. Keep the
two files in step — a menu entry whose path has no route silently redirects to the first entry,
which looks like a broken link.

Role resolution **fails closed**. `selectUserRole` used to return `undefined` for an
unrecognised role and let the caller invoke it (§7.5 of the developer guide); it now throws
`UnknownRoleError`. `smileUserInfoSharedState` used to default a staff account with no matching
realm role to `clinician` — handing the fullest clinical surface to a misconfigured account —
and now returns a failure instead.

**None of this is a security control, and it must not be described as one.** It is the same
category as §4's description of default Beda: the role shapes the UI. Every one of these checks
runs in the browser, and the user's token is unchanged by any of them — a signed-in triage
nurse can still `curl` the gateway and write a `Condition`. What this buys is that staff cannot
reach the wrong station *by accident*, which is a genuine usability and data-quality win and
nothing more. The gap in §10 is unchanged.

### Gateway allowlist

`resources/gateway-config/hapi_allowed_queries.json` must contain an entry for every resource
type the UI touches, or the request 403s with no useful client-side error. The OPD work needed
`Encounter`, `ServiceRequest`, `DiagnosticReport`, `Specimen`, `MedicationDispense`, `Invoice`,
`ChargeItem` and `PaymentReconciliation`, plus the terminology paths in
`docs/opd-terminology.md` (`ValueSet/$expand` and friends) for `answerValueSet` dropdowns.

The allowlist is **type-level, not role-level** — it says which queries any authenticated user
may run, so adding an entry widens access for everyone. That is the §10 trade-off in miniature:
each entry added for a feature is also an entry not available to narrow later.

Changes need a gateway restart; the file is a read-only bind mount:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart fhir-gateway
```

---

## 7. What a policy looks like

### If we were on Aidbox

Policies are data. A real one, rather than Beda's blanket allow:

```yaml
id: pharmacist-policy
resourceType: AccessPolicy
engine: matcho
matcho:
  user:
    role:
      $contains:
        name: pharmacist
  request-method:
    $enum: ["get", "post", "put", "patch"]
  uri:
    $one-of:
      - "#/fhir/MedicationDispense.*"
      - "#/fhir/MedicationRequest.*"
      - "#/fhir/Patient.*"
      - "#/fhir/Encounter.*"
      - "#/fhir/Task.*"
```

Readable, versionable, no compilation. This is the attractive part of the Aidbox model — and note that **Beda does not ship anything like it**; you would write every one of these yourself.

### On our stack

There is no policy-as-data option. Authorization lives in a Java class the gateway loads:

```java
public class NawiAccessChecker implements AccessChecker {

  @Override
  public AccessDecision checkAccess(RequestDetailsReader request) {
    Set<String> roles = rolesFromToken(request);          // realm_access.roles
    String resourceType = request.getResourceName();       // "Condition"
    RequestTypeEnum method = request.getRequestType();     // POST

    if (!writeMatrix.allows(roles, resourceType, method)) {
      return NoOpAccessDecision.accessDenied();
    }
    // Still enforce patient scope — do not lose what `list` gives us today.
    return patientScopeDecision(request, roles);
  }
}
```

The matrix itself should be a resource file the class reads, not hard-coded, so changing a permission stays a config change and not a Java release.

---

## 8. The options

| Option | Gets us the matrix? | Cost | Verdict |
| --- | --- | --- | --- |
| **Custom `AccessChecker` plugin** | Yes | Java, own build and tests, derived gateway image in Compose and CI | **Chosen (D3)** |
| **Migrate to Aidbox + write AccessPolicies** | Yes | Backend migration; contradicts D0; Beda's shipped policies give nothing | Rejected |
| **SMART-on-FHIR scopes** | Partly | The `patient` checker is closer to this, but is still compartment-shaped | Insufficient alone |
| **Enforce in our own middleware** | Yes | Fastest, but a second thing to keep in step, and bypassable by calling the gateway directly | Rejected |

### Why not just move to Aidbox

Tempting, since policies-as-data is nicer than Java. But: Beda's own policies are blanket-allow, so you write the real ones regardless; it contradicts D0 (HAPI is the V1 target); and it would invert every Aidbox-vs-HAPI decision already made and documented. The nicer policy model does not pay for a backend migration.

---

## 9. Implementing the plugin

Roughly what the work involves. Not a full design.

1. **A new JVM module.** The gateway loads access checkers by factory registration, which is why it can list them at startup. Ours registers a third alongside `list` and `patient`.
2. **The matrix as a resource file**, read at startup — same spirit as `hapi_allowed_queries.json`. Changing a permission should not mean recompiling.
3. **Keep patient scoping.** The new checker must do *both* jobs: role/operation *and* patient compartment. Dropping the compartment check to add roles would be a net loss.
4. **Handle `Task` by code**, not just by resource type — see §6 rule 1.
5. **A derived image.** The deployment stops using stock `fhir-gateway:latest`; Compose and CI build and publish our own. This is new infrastructure the repository does not have today, and is most of the non-Java effort.
6. **Revisit the allowlist.** Some entries exist only because the compartment checker was too blunt. With real role checks, several can be narrowed or removed — in particular the `Patient?_sort=…` entry that currently exposes every patient.

### How to know it works

Unit tests on the matrix are necessary but not sufficient — they test the table, not the wiring. The real test is negative, against the running gateway:

```sh
# As a pharmacist, writing a diagnosis must be refused.
curl -i -X POST http://localhost:8084/fhir/Condition \
  -H "Authorization: Bearer $PHARMACIST_TOKEN" \
  -H 'Content-Type: application/fhir+json' \
  -d '{"resourceType":"Condition","subject":{"reference":"Patient/pat-1001"}}'
# expect 403
```

Write one of these per forbidden pairing in §6 and keep them in CI. A permission matrix nobody tests negatively is a matrix that quietly stops working.

---

## 10. Until then

If real data arrives before the plugin does, the mitigations available are weak — worth stating plainly rather than implying the gap is smaller than it is:

- **Trusted-network deployment only.** No public exposure of the gateway.
- **Fewest possible accounts**, one per real person, no shared logins — so the audit trail in `Task.requester` and `Observation.performer` means something.
- **Narrow the allowlist.** Several entries are broader than any workflow needs. Removing the `Patient?_sort=…` entry alone would restore the patient-compartment restriction, at the cost of the patient list page.
- **Do not present role separation as a security control** to a clinic or an auditor. It is a usability feature today.

None of these substitute for the plugin. They reduce exposure; they do not close the gap.
