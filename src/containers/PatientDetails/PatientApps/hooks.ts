import { Encounter } from 'fhir/r4b';

import { Client } from '@beda.software/aidbox-types';
import { aidboxService, getFHIRResources } from '@beda.software/emr/dist/services/fhir';
import config from '@beda.software/emr-config';
import { extractBundleResources, useService, WithId } from '@beda.software/fhir-react';
import { success, mapSuccess } from '@beda.software/remote-data';

import { matchCurrentUserRole, Role } from 'src/utils/role';

export function useSmartApps(encounter?: Encounter) {
    const [appsRemoteData] = useService(async () => {
        let clientType = matchCurrentUserRole<string>({
            [Role.Patient]: () => 'smart-on-fhir-patient',
            [Role.Administrator]: () => 'smart-on-fhir',
            [Role.Clinician]: () => 'smart-on-fhir-practitioner',
            [Role.Receptionist]: () => 'smart-on-fhir-practitioner',
            [Role.TriageNurse]: () => 'smart-on-fhir-practitioner',
            [Role.LabTechnician]: () => 'smart-on-fhir-practitioner',
            [Role.Pharmacist]: () => 'smart-on-fhir-practitioner',
            [Role.Cashier]: () => 'smart-on-fhir-practitioner',
        });
        if (encounter) {
            if (clientType === 'smart-on-fhir-practitioner') {
                clientType = 'smart-on-fhir-encounter';
            } else {
                const mockResonse: Array<WithId<Client>> = [];
                return success(mockResonse);
            }
        }
        return mapSuccess(
            await getFHIRResources<Client>('Client', { ['.type']: clientType, _sort: '-lastUpdated' }),
            (b) => extractBundleResources(b).Client,
        );
    });
    return { appsRemoteData };
}

export interface LaunchProps {
    user: string;
    client: string;
    patient: string;
    practitioner?: string;
    encounter?: string;
}

interface LaunchRPCResult {
    result: {
        uri: string;
    };
}

export async function getLaunchURI({ user, client, patient, practitioner, encounter }: LaunchProps) {
    return await aidboxService<LaunchRPCResult>({
        url: '/rpc',
        method: 'POST',
        data: {
            method: 'aidbox.smart/get-launch-uri',
            params: {
                user,
                iss: encodeURIComponent(`${config.baseURL}/fhir`),
                client,
                ctx: {
                    patient,
                    ...(practitioner ? { practitioner } : {}),
                    ...(encounter ? { encounter } : {}),
                },
            },
        },
    });
}
