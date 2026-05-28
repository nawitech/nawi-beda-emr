import { Organization, Patient, Practitioner, PractitionerRole } from 'fhir/r4b';
import { decodeJwt, JWTPayload } from 'jose';

import { InternalReference, User } from '@beda.software/aidbox-types';
import { getFHIRResource, getFHIRResources, getIdToken, getUserInfo } from '@beda.software/emr/services';
import {
    sharedAuthorizedOrganization,
    sharedAuthorizedPractitioner,
    sharedAuthorizedPractitionerRoles,
    sharedAuthorizedPatient,
    sharedAuthorizedUser,
} from '@beda.software/emr/sharedState';
import config from '@beda.software/emr-config';
import { extractBundleResources } from '@beda.software/fhir-react';
import { failure, isSuccess, RemoteDataResult, success } from '@beda.software/remote-data';

import { AuthProvider, tierConfigMap } from 'src/services/auth';
import { Role, selectUserRole } from 'src/utils/role';

export interface SmileIdTokenData extends JWTPayload {
    fhirUser: string;
    realm_access?: { roles: string[] };
}

const STAFF_ROLES: Role[] = [
    Role.Receptionist,
    Role.TriageNurse,
    Role.Clinician,
    Role.LabTechnician,
    Role.Pharmacist,
    Role.Cashier,
    Role.Administrator,
];

export async function fetchUserRoleDetails(user: User) {
    const initializer = selectUserRole(user, {
        [Role.Administrator]: async () => {
            const organizationId = user.role![0]!.links!.organization!.id;
            const response = await getFHIRResource<Organization>({
                reference: `Organization/${organizationId}`,
            });
            if (isSuccess(response)) {
                sharedAuthorizedOrganization.setSharedState(response.data);
            } else {
                console.error(response.error);
            }
        },
        [Role.Clinician]: async () => fetchPractitionerDetails(user),
        [Role.Receptionist]: async () => fetchPractitionerDetails(user),
        [Role.TriageNurse]: async () => fetchPractitionerDetails(user),
        [Role.LabTechnician]: async () => fetchPractitionerDetails(user),
        [Role.Pharmacist]: async () => fetchPractitionerDetails(user),
        [Role.Cashier]: async () => fetchPractitionerDetails(user),
        [Role.Patient]: async () => {
            const patientId = user.role![0]!.links!.patient!.id;
            const response = await getFHIRResource<Patient>({
                reference: `Patient/${patientId}`,
            });
            if (isSuccess(response)) {
                sharedAuthorizedPatient.setSharedState(response.data);
            } else {
                console.error(response.error);
            }
        },
    });

    await initializer();
}

async function fetchPractitionerDetails(user: User) {
    const practitionerId = user.role![0]!.links!.practitioner!.id;

    const practitionerResponse = await getFHIRResource<Practitioner>({
        reference: `Practitioner/${practitionerId}`,
    });
    if (isSuccess(practitionerResponse)) {
        sharedAuthorizedPractitioner.setSharedState(practitionerResponse.data);
    } else {
        console.error(practitionerResponse.error);
    }

    const rolesResponse = await getFHIRResources<PractitionerRole>('PractitionerRole', {
        practitioner: `Practitioner/${practitionerId}`,
    });
    if (isSuccess(rolesResponse)) {
        sharedAuthorizedPractitionerRoles.setSharedState(extractBundleResources(rolesResponse.data).PractitionerRole);
    } else {
        console.error(rolesResponse.error);
    }
}

export async function projectPopulateUserInfoSharedState(): Promise<RemoteDataResult<User>> {
    const userResponse = await getUserInfo();
    if (!isSuccess(userResponse)) return userResponse;

    const user = userResponse.data;
    sharedAuthorizedUser.setSharedState(user);

    if (user.role) {
        await fetchUserRoleDetails(user);
    }

    return userResponse;
}

const mockUserInfoSharedState = (practitionerId: string) => async (): Promise<RemoteDataResult<User>> => {
    const user: User = {
        resourceType: 'User',
        id: 'user',
        fhirUser: {
            resourceType: 'Practitioner',
            id: practitionerId,
        },
        role: [
            {
                resourceType: 'Role',
                name: Role.Clinician,
                user: { resourceType: 'User', id: 'user' },
                links: { practitioner: { resourceType: 'Practitioner', id: practitionerId } },
            },
        ],
    };
    sharedAuthorizedUser.setSharedState(user);

    if (config.baseURL === tierConfigMap[AuthProvider.OrionHealth].develop.baseUrl) {
        sharedAuthorizedPractitioner.setSharedState({ resourceType: 'Practitioner', id: practitionerId });
        sharedAuthorizedPractitionerRoles.setSharedState([]);
    } else {
        await fetchUserRoleDetails(user);
    }

    return success(user);
};

export async function smileUserInfoSharedState(): Promise<RemoteDataResult<User>> {
    const idToken = getIdToken();

    if (!idToken) {
        return failure({ error: 'id_token is not provided' });
    }

    const decoded = decodeJwt(idToken) as SmileIdTokenData;
    const { fhirUser } = decoded;

    const fhirUserData = fhirUser.split('/').slice(-2);
    const resourceType = fhirUserData[0] as 'Practitioner' | 'Patient' | 'Organization';
    const resourceId = fhirUserData[1]!;

    const fhirUserRef: InternalReference<Patient | Practitioner | Organization> = {
        resourceType,
        id: resourceId,
    };

    let roleName: Role;
    if (resourceType === 'Patient') {
        roleName = Role.Patient;
    } else if (resourceType === 'Organization') {
        roleName = Role.Administrator;
    } else {
        const keycloakRoles = decoded.realm_access?.roles ?? [];
        roleName = STAFF_ROLES.find((r) => keycloakRoles.includes(r)) ?? Role.Clinician;
    }

    const roleLinks =
        resourceType === 'Practitioner'
            ? { practitioner: { resourceType: 'Practitioner' as const, id: resourceId } }
            : resourceType === 'Organization'
              ? { organization: { resourceType: 'Organization' as const, id: resourceId } }
              : { patient: { resourceType: 'Patient' as const, id: resourceId } };

    const user: User = {
        resourceType: 'User',
        id: fhirUserRef.id,
        fhirUser: fhirUserRef as User['fhirUser'],
        role: [
            {
                resourceType: 'Role',
                name: roleName,
                user: { resourceType: 'User', id: fhirUserRef.id },
                links: roleLinks,
            },
        ],
    };

    sharedAuthorizedUser.setSharedState(user);
    await fetchUserRoleDetails(user);

    return success(user);
}

export type SharedUserInitCallback = () => Promise<RemoteDataResult<User>>;
export const clientSharedUserInitService: { [key in AuthProvider]: SharedUserInitCallback | undefined } = {
    [AuthProvider.AuCoreAidbox]: projectPopulateUserInfoSharedState,
    [AuthProvider.ErequestingAidbox]: projectPopulateUserInfoSharedState,
    [AuthProvider.ErequestingSparked]: smileUserInfoSharedState,
    [AuthProvider.SmartOnFhirAidbox]: projectPopulateUserInfoSharedState,
    [AuthProvider.SparkedHAPI]: smileUserInfoSharedState,
    [AuthProvider.BP]: mockUserInfoSharedState('15000000-0020-0000-0000-98a3489d6ffc'),
    [AuthProvider.IRIS]: mockUserInfoSharedState('cardy-igist'),
    [AuthProvider.MediRecords]: mockUserInfoSharedState('b82b3842-ba16-4b01-8c24-7b0deee9b660'),
    [AuthProvider.ErequestingCallistemon]: mockUserInfoSharedState('1153'),
    [AuthProvider.HaloConnect]: mockUserInfoSharedState('pr-1'),
    [AuthProvider.MedtechGlobal]: mockUserInfoSharedState('pr-1'),
    [AuthProvider.Sparked]: mockUserInfoSharedState('leishman-leesa'),
    [AuthProvider.DigitalHealth]: mockUserInfoSharedState('example-healthconnect-practitioner-1'),
    [AuthProvider.Epic]: mockUserInfoSharedState('e-.Lo31-.yLLfMmz0ylcV7A3'),
    [AuthProvider.OrionHealth]: mockUserInfoSharedState('orion-health'),
    [AuthProvider.OHSKeycloak]: smileUserInfoSharedState,
    [AuthProvider.OHSKeycloakLocal]: smileUserInfoSharedState,
};
