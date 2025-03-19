import { FileOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Collapse, Typography } from 'antd';
import { Bundle, Composition, Patient, Practitioner } from 'fhir/r4b';

import { DashboardCard, Spinner } from '@beda.software/emr/components';
import type { ContainerProps } from '@beda.software/emr/dist/components/Dashboard/types';
import { S } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/PatientOverview.styles';
import { service } from '@beda.software/emr/services';
import { RenderRemoteData, extractBundleResources, useService } from '@beda.software/fhir-react';

import { S as DocRefStyles } from '../DocRefContainer/DocRefContainer.styles';
import { parsePatientSummary } from '../DocRefContainer/utils';

export function SummaryContainer(props: ContainerProps) {
    const [response] = useService<Bundle>(() =>
        service({ url: `Patient/${props.patient.id!}/$summary` }),
    );

    return (
        <DashboardCard title={t`Patient Summary`} icon={<FileOutlined />}>
            <S.DetailsRow>
                <RenderRemoteData
                    remoteData={response}
                    renderLoading={Spinner}
                    renderFailure={(failure) => <pre>{failure.message ?? JSON.stringify(failure, undefined, 4)}</pre>}
                >
                    {(bundle) => {
                        return (
                            <DocRefStyles.Container>
                                {parsePatientSummary(bundle).map((item, index) => {
                                    return (
                                        <Collapse
                                            key={`${item.title}-${index}`}
                                            items={[
                                                {
                                                    key: item.title,
                                                    label: (
                                                        <DocRefStyles.PatientSummaryItemContainer>
                                                            <Typography.Text strong>{item.title}</Typography.Text>
                                                            <DocRefStyles.PatientSummaryItemText>
                                                                {item.text}
                                                            </DocRefStyles.PatientSummaryItemText>
                                                        </DocRefStyles.PatientSummaryItemContainer>
                                                    ),
                                                    children: (
                                                        <DocRefStyles.PatientSummaryItemContainer>
                                                            {item.entries.map((relatedResourceRef) => (
                                                                <DocRefStyles.PatientSummaryItemText
                                                                    key={relatedResourceRef.reference}
                                                                >
                                                                    {relatedResourceRef.reference}
                                                                </DocRefStyles.PatientSummaryItemText>
                                                            ))}
                                                        </DocRefStyles.PatientSummaryItemContainer>
                                                    ),
                                                },
                                            ]}
                                        />
                                    );
                                })}
                            </DocRefStyles.Container>
                        );
                    }}
                </RenderRemoteData>
            </S.DetailsRow>
        </DashboardCard>
    );
}
