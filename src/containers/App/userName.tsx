import {
    sharedAuthorizedOrganization,
    sharedAuthorizedPatient,
    sharedAuthorizedPractitioner,
} from '@beda.software/emr/sharedState';
import { renderHumanName } from '@beda.software/emr/utils';

// Rendered inside the bottom menu label for the signed-in user. Kept in their own module so
// bottomMenuLayout.tsx exports only its layout factory.

export function PatientName() {
    const [patient] = sharedAuthorizedPatient.useSharedState();
    const name = patient?.name?.[0];
    if (name) return <span>{renderHumanName(name)}</span>;
    return <span>{patient?.telecom?.find(({ system }) => system === 'email')?.value}</span>;
}

export function PractitionerName() {
    const [practitioner] = sharedAuthorizedPractitioner.useSharedState();
    return <span>{renderHumanName(practitioner?.name?.[0])}</span>;
}

export function OrganizationName() {
    const [organization] = sharedAuthorizedOrganization.useSharedState();
    return <span>{organization?.name}</span>;
}
