# Workflow transitions

Read this reference when a request introduces stages, handoffs, queues, or statuses.

## Model the transition explicitly

Write down this tuple before implementation:

```text
current state + actor + action -> resulting state + next owner
```

Example:

```text
triage in progress + triage nurse + submit triage
  -> ready for consultation + clinician
```

Specify what resource is authoritative. Do not infer workflow state merely from whether a form exists unless that is the deliberate model.

## Choosing a FHIR representation

Use broad encounter lifecycle fields for broad visit state. Use `Task` when work must be queued, assigned, accepted, completed, or handed between roles. Use a local coded `businessStatus` for organization-specific stages while keeping the standard `Task.status` valid.

A minimal queued transition generally needs:

```yaml
resourceType: Task
status: ready
intent: order
code:
  coding:
    - system: <stable-local-code-system>
      code: <work-type>
businessStatus:
  coding:
    - system: <stable-local-status-system>
      code: <stage>
"for":
  reference: Patient/<id>
authoredOn: <FHIR-dateTime>
requester:
  reference: Practitioner/<id>
```

When an Encounter exists, normally retain the patient in `Task.for` and use `Task.focus` for the encounter or other resource being acted upon. Confirm the chosen semantics for the installation.

## Atomicity and progression

Create or update the transition in the same transaction Bundle as the clinical action that causes it. A browser callback must not be the authoritative transition.

Each queued stage must define:

- the Task code and business status;
- the query used by the next queue;
- who may see, claim, complete, or cancel it;
- what completes the current Task;
- whether completing it creates another Task;
- repeat-submission behavior;
- cancellation, correction, and reopening behavior if required.

Do not create a new ready Task every time a form is reopened unless duplicate work items are acceptable. For production workflows, prefer a stable business identifier or a conditional create/update strategy.

## Code systems

Use stable canonical URLs controlled by the deployment, for example:

```text
https://emr.nawi.ke/fhir/CodeSystem/opd-task
https://emr.nawi.ke/fhir/CodeSystem/opd-workflow-status
```

Create formal `CodeSystem` resources when the codes become shared, validated, reported on, or expanded beyond a prototype. Document code meaning and allowed transitions.

## Authorization

UI visibility is not enforcement. Review:

- role-specific routes and menus;
- FHIR gateway query allowlists;
- resource access rules;
- permission to invoke SDC operations;
- permission for the extraction service to execute the transaction.

Do not bypass the gateway to make a workflow appear functional.


## Queue surfaces

A stage handoff is only real when the next role can find the work. Build the queue with `ResourceListPage` over the queued resource rather than a custom page — it already supports `searchParams`, `getFilters`, `extractPrimaryResources` and a per-row `getClinicalContext` (`contrib/fhir-emr/dist/uberComponents/ResourceListPage/types.d.ts`).

```tsx
<ResourceListPage<Task>
    headerTitle={t`Consultation queue`}
    resourceType="Task"
    searchParams={{
        code: '<code-system>|<work-type>',
        status: 'ready',
        _include: ['Task:patient', 'Task:focus:Encounter'],
        _sort: 'authored-on',
    }}
    getClinicalContext={(record) => /* resolve Patient/Encounter out of record.bundle */}
    getRecordActions={() => [questionnaireAction('Start consultation', '<stage-questionnaire>')]}
/>
```

Two things to get right:

- `getClinicalContext` must supply every launch variable the stage mapping declares. The row's primary resource is the default, which is rarely sufficient for a Task-based queue — the form usually needs the Patient and Encounter pulled from `record.bundle` via `_include`.
- The stage form's mapping completes the current Task and creates the next one in the same transaction as its clinical writes. A queue that empties because the UI navigated away is not a transition.

Add the `_include` search shape to `resources/gateway-config/hapi_allowed_queries.json`; the gateway rejects search shapes it does not list.
