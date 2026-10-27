/**
 * Canonical URLs for the OPD workflow code systems this deployment owns.
 *
 * These are referenced by both the FHIR seeds (resources/fhir-seeds/Mapping/*.yaml) and the
 * queue containers, so they must stay in step. Changing a value here without changing the
 * seeds will silently empty a queue.
 */
export const OPD_TASK_CODE_SYSTEM = 'https://emr.nawi.ke/fhir/CodeSystem/opd-task';
export const OPD_WORKFLOW_STATUS_SYSTEM = 'https://emr.nawi.ke/fhir/CodeSystem/opd-workflow-status';
export const OPD_TASK_IDENTIFIER_SYSTEM = 'https://emr.nawi.ke/fhir/sid/opd-task';
