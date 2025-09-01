import { Encounter } from 'fhir/r4b';

import { useService } from 'aidbox-react/lib/hooks/service';
import { success } from 'aidbox-react/lib/libs/remoteData';
import { extractBundleResources, getFHIRResources as getAidboxResources, WithId } from 'aidbox-react/lib/services/fhir';
import { mapSuccess, service } from 'aidbox-react/lib/services/service';

import { Client } from '@beda.software/aidbox-types';
import { matchCurrentUserRole, Role } from '@beda.software/emr/dist/utils/role';
import config from '@beda.software/emr-config';

export function useSmartApps(encounter?: Encounter) {
    const [appsRemoteData] = useService(async () => {
        let clientType = matchCurrentUserRole<string>({
            [Role.Patient]: () => 'smart-on-fhir-patient',
            [Role.Admin]: () => 'smart-on-fhir',
            [Role.Practitioner]: () => 'smart-on-fhir-practitioner',
            [Role.Receptionist]: () => 'smart-on-fhir-practitioner',
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
            await getAidboxResources<Client>('Client', { ['.type']: clientType }),
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
    return await service<LaunchRPCResult>({
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
