import { Bundle, MedicationDispense, MedicationRequest, Resource, Task } from 'fhir/r4b';

export const MEDICATIONS_DUE_SEARCH_PARAMS = {
    status: 'active',
    _revinclude: ['Task:focus', 'MedicationDispense:prescription'],
    _include: 'MedicationRequest:patient',
    _total: 'accurate',
    _count: 20,
};

export type PharmacyStage = 'delivered' | 'filled' | 'received' | 'unknown';

export interface PharmacyStatus {
    stage: PharmacyStage;
    label: string;
    at?: string;
    location?: string;
}

export function pharmacyStatus(
    request: MedicationRequest,
    tasks: Task[],
    dispenses: MedicationDispense[],
): PharmacyStatus {
    const reference = `MedicationRequest/${request.id}`;
    const dispense = dispenses.find((d) => (d.authorizingPrescription ?? []).some((p) => p.reference === reference));

    if (dispense?.status === 'completed' && dispense.whenHandedOver) {
        return {
            stage: 'delivered',
            label: 'Delivered — available for administration',
            at: dispense.whenHandedOver,
            location: dispense.destination?.display ?? dispense.destination?.reference?.split('/')[1],
        };
    }

    if (dispense && dispense.status === 'in-progress') {
        return {
            stage: 'filled',
            label: 'Filled by pharmacy — in transit',
            at: dispense.whenPrepared,
        };
    }

    const task = tasks.find((t) => t.focus?.reference === reference);

    if (task) {
        return {
            stage: 'received',
            label: 'Order received by pharmacy — awaiting verification',
            at: task.authoredOn,
        };
    }

    return { stage: 'unknown', label: 'Not sent to pharmacy' };
}

export function collect<T extends Resource>(bundle: Bundle, resourceType: T['resourceType']): T[] {
    return (bundle.entry ?? [])
        .map((entry) => entry.resource)
        .filter((resource) => resource?.resourceType === resourceType) as T[];
}

export function medicationName(request: MedicationRequest): string {
    return (
        request.medicationCodeableConcept?.text ??
        request.medicationCodeableConcept?.coding?.[0]?.display ??
        'Unknown medication'
    );
}
