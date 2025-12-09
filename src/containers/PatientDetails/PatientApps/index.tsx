import { Button, Card, Typography } from 'antd';
import { Encounter, Patient } from 'fhir/r4b';

import { RenderRemoteData } from 'aidbox-react/lib/components/RenderRemoteData';

import { Client } from '@beda.software/aidbox-types';
import { selectCurrentUserRoleResource } from '@beda.software/emr/dist/utils/role';
import { mapSuccess } from '@beda.software/remote-data';

import { getLaunchURI, LaunchProps, useSmartApps } from './hooks';
import { S } from './PatientApps.styles';

const { Text } = Typography;

interface PatientAppsProps {
    patient: Patient;
    encounter?: Encounter;
}
interface SmartAppProps {
    patient: Patient;
    app: Client;
    encounter?: Encounter;
}

export function useLaunchApp({ app, patient, encounter }: SmartAppProps) {
    const currentUser = selectCurrentUserRoleResource();
    const launchApp = async () => {
        const launchParams: LaunchProps = {
            client: app.id!,
            user: currentUser.id,
            patient: patient.id!,
            encounter: encounter?.id,
        };
        if (currentUser.resourceType === 'Practitioner') {
            launchParams.practitioner = currentUser.id;
        }
        mapSuccess(await getLaunchURI(launchParams), (launchURI) => {
            switch (app.id) {
                case 'aus-cvd-risk-i':
                    window.location.href = launchURI.result.uri + '&ctoken=2025';
                    break;
                case 'dd133f3b-4937-4575-b51f-419340a7d2dc':
                    window.location.href = launchURI.result.uri + '&con=f1c3c1d4-ed0e-4eaf-8929-c8a3a689fe55';
                    break;
                default:
                    window.location.href = launchURI.result.uri;
                    break;
            }
        });
    };
    return launchApp;
}

function SmartApp(props: SmartAppProps) {
    const launchApp = useLaunchApp(props);
    return (
        <Card
            title={props.app.smart?.name ?? 'UNKNOWN'}
            style={{ width: 300 }}
            extra={
                <Button type="primary" onClick={launchApp}>
                    Launch
                </Button>
            }
        >
            <Text>{props.app.smart?.description}</Text>
        </Card>
    );
}

export function PatientApps({ patient, encounter }: PatientAppsProps) {
    const { appsRemoteData } = useSmartApps(encounter);
    return (
        <RenderRemoteData remoteData={appsRemoteData}>
            {(data) => {
                const apps = data ?? [];
                if (apps.length == 0) {
                    return <Text>There are no registered smart apps</Text>;
                } else {
                    return (
                        <S.Container>
                            {apps.map((app) => (
                                <SmartApp key={app.id} app={app} patient={patient} encounter={encounter} />
                            ))}
                        </S.Container>
                    );
                }
            }}
        </RenderRemoteData>
    );
}
