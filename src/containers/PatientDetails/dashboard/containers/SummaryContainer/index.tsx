import { FileOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Typography } from 'antd';

import { DashboardCard, Spinner } from '@beda.software/emr/components';
import type { ContainerProps } from '@beda.software/emr/dist/components/Dashboard/types';
import { S } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/PatientOverview.styles';
import { RenderRemoteData, extractBundleResources } from '@beda.software/fhir-react';
import { useService } from '@beda.software/fhir-react';

import { S as DocRefStyles } from '../DocRefContainer/DocRefContainer.styles';
import { parsePatientSummary } from '../DocRefContainer/utils';
import { Bundle, Composition } from 'fhir/r4b';
import { service } from '@beda.software/emr/services';

export function SummaryContainer(props: ContainerProps) {
    const [response] = useService<Bundle<Composition>>(() => service({ url: `Patient/${props.patient.id!}/$summary` }));
    return (
        <DashboardCard title={t`Patient Summary`} icon={<FileOutlined />}>
            <S.DetailsRow>
                <RenderRemoteData
                    remoteData={response}
                    renderLoading={Spinner}
                    renderFailure={(failure) => <pre>{failure.message ?? JSON.stringify(failure, undefined, 4)}</pre>}
                >
                    {(bundle) => {
                        const patientSummary = extractBundleResources(bundle).Composition[0];
                        return (
                            <DocRefStyles.Container>
                                {
                                    parsePatientSummary(patientSummary).map((item) => {
                                        return (
                                            <DocRefStyles.PatientSummaryItemContainer key={item.title}>
                                                <Typography.Text strong>{item.title}</Typography.Text>
                                                <DocRefStyles.PatientSummaryItemText>
                                                    {item.text}
                                                </DocRefStyles.PatientSummaryItemText>
                                            </DocRefStyles.PatientSummaryItemContainer>
                                        );
                                    })
                                }
                            </DocRefStyles.Container>
                        );
                    }}
                </RenderRemoteData>
            </S.DetailsRow>
        </DashboardCard>
    );
}
