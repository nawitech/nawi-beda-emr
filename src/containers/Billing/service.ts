import { Bundle, Claim, ClaimResponse, Patient } from 'fhir/r4b';

export const REJECTION_WORKQUEUE_SEARCH_PARAMS = {
    '_has:ClaimResponse:request:outcome': 'error',
    '_has:ClaimResponse:request:status': 'active',
    _revinclude: 'ClaimResponse:request',
    _include: 'Claim:patient',
    _total: 'accurate',
    _count: 10,
};

export function findClaimResponse(bundle: Bundle, claim: Claim): ClaimResponse | undefined {
    return (bundle.entry ?? [])
        .map((entry) => entry.resource)
        .find(
            (resource): resource is ClaimResponse =>
                resource?.resourceType === 'ClaimResponse' &&
                resource.request?.reference === `Claim/${claim.id}` &&
                resource.status === 'active',
        );
}

export function findClaimPatient(bundle: Bundle, claim: Claim): Patient | undefined {
    const reference = claim.patient?.reference;

    return (bundle.entry ?? [])
        .map((entry) => entry.resource)
        .find(
            (resource): resource is Patient =>
                resource?.resourceType === 'Patient' && `Patient/${resource.id}` === reference,
        );
}

export function rejectionCode(response: ClaimResponse | undefined): string {
    const error = response?.error?.[0]?.code;

    return error?.text ?? error?.coding?.map((coding) => coding.code).join(':') ?? '—';
}

export function submittedSubscriberInfo(claim: Claim): string | undefined {
    return claim.supportingInfo?.find((info) => info.valueString)?.valueString;
}

export function payerDateOfBirth(response: ClaimResponse | undefined): string | undefined {
    const note = response?.processNote?.find((n) => n.text?.includes('date of birth'));

    return note?.text?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
}

export function claimTotal(claim: Claim): string {
    const total = claim.total;

    return total?.value === undefined ? '—' : `${total.value.toFixed(2)} ${total.currency ?? ''}`.trim();
}
