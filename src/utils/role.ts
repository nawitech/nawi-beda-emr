import { Organization, Patient, Practitioner } from 'fhir/r4b';

import { User } from '@beda.software/aidbox-types';
import {
    sharedAuthorizedOrganization,
    sharedAuthorizedPatient,
    sharedAuthorizedPractitioner,
    sharedAuthorizedUser,
} from '@beda.software/emr/sharedState';
import { WithId } from '@beda.software/fhir-react';

export enum Role {
    Receptionist = 'receptionist',
    TriageNurse = 'triage-nurse',
    Clinician = 'clinician',
    LabTechnician = 'lab-technician',
    Pharmacist = 'pharmacist',
    Cashier = 'cashier',
    Administrator = 'administrator',
    Patient = 'patient',
}

export function selectUserRole<T>(user: User, options: { [role in Role]: T }): T {
    const userRole = user.role![0]!.name as Role;
    return options[userRole];
}

export function matchCurrentUserRole<T>(options: {
    [Role.Receptionist]: (practitioner: WithId<Practitioner>) => T;
    [Role.TriageNurse]: (practitioner: WithId<Practitioner>) => T;
    [Role.Clinician]: (practitioner: WithId<Practitioner>) => T;
    [Role.LabTechnician]: (practitioner: WithId<Practitioner>) => T;
    [Role.Pharmacist]: (practitioner: WithId<Practitioner>) => T;
    [Role.Cashier]: (practitioner: WithId<Practitioner>) => T;
    [Role.Administrator]: (organization: WithId<Organization>) => T;
    [Role.Patient]: (patient: WithId<Patient>) => T;
}): T {
    return selectUserRole(sharedAuthorizedUser.getSharedState()!, {
        [Role.Receptionist]: () => options[Role.Receptionist](sharedAuthorizedPractitioner.getSharedState()!),
        [Role.TriageNurse]: () => options[Role.TriageNurse](sharedAuthorizedPractitioner.getSharedState()!),
        [Role.Clinician]: () => options[Role.Clinician](sharedAuthorizedPractitioner.getSharedState()!),
        [Role.LabTechnician]: () => options[Role.LabTechnician](sharedAuthorizedPractitioner.getSharedState()!),
        [Role.Pharmacist]: () => options[Role.Pharmacist](sharedAuthorizedPractitioner.getSharedState()!),
        [Role.Cashier]: () => options[Role.Cashier](sharedAuthorizedPractitioner.getSharedState()!),
        [Role.Administrator]: () => options[Role.Administrator](sharedAuthorizedOrganization.getSharedState()!),
        [Role.Patient]: () => options[Role.Patient](sharedAuthorizedPatient.getSharedState()!),
    })();
}

export function selectCurrentUserRoleResource(): WithId<Patient> | WithId<Practitioner> | WithId<Organization> {
    return matchCurrentUserRole<WithId<Patient> | WithId<Practitioner> | WithId<Organization>>({
        [Role.Receptionist]: (p) => p,
        [Role.TriageNurse]: (p) => p,
        [Role.Clinician]: (p) => p,
        [Role.LabTechnician]: (p) => p,
        [Role.Pharmacist]: (p) => p,
        [Role.Cashier]: (p) => p,
        [Role.Administrator]: (o) => o,
        [Role.Patient]: (p) => p,
    });
}
