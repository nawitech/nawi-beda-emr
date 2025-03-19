import { FileOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Collapse, Typography } from 'antd';
import { Bundle } from 'fhir/r4b';

import { DashboardCard, Spinner } from '@beda.software/emr/components';
import type { ContainerProps } from '@beda.software/emr/dist/components/Dashboard/types';
import { S } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/PatientOverview.styles';
import { service } from '@beda.software/emr/services';
import { RenderRemoteData, useService } from '@beda.software/fhir-react';

import { S as DocRefStyles } from '../DocRefContainer/DocRefContainer.styles';
import { parsePatientSummary, ResourcFetchInfo } from '../DocRefContainer/utils';

function RelatedResourceInfoContainer({ resourceInfo }: { resourceInfo: ResourcFetchInfo }) {
    return (
        <DocRefStyles.PatientSummaryItemContainer>
            <DocRefStyles.PatientSummaryItemText>
                {`Resource: ${resourceInfo.resourceType}`}
            </DocRefStyles.PatientSummaryItemText>
            {/* <DocRefStyles.PatientSummaryItemText>
                {`ID: ${resourceInfo.resourceId}`}
            </DocRefStyles.PatientSummaryItemText> */}
            {resourceInfo.main ? (
                <DocRefStyles.PatientSummaryItemText>
                    {`Main info: ${resourceInfo.main}`}
                </DocRefStyles.PatientSummaryItemText>
            ) : null}
            {resourceInfo.additional ? (
                <DocRefStyles.PatientSummaryItemText>
                    {`Additional info: ${resourceInfo.additional}`}
                </DocRefStyles.PatientSummaryItemText>
            ) : null}
        </DocRefStyles.PatientSummaryItemContainer>
    );
}

export function SummaryContainer(props: ContainerProps) {
    const [response] = useService<Bundle>(() => service({ url: `Patient/${props.patient.id!}/$summary` }));

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
                                                        <DocRefStyles.ResourceFetchInfoContainer>
                                                            {item.relatedResources.map((resourceInfo) => (
                                                                <RelatedResourceInfoContainer
                                                                    key={resourceInfo.resourceId}
                                                                    resourceInfo={resourceInfo}
                                                                />
                                                            ))}
                                                        </DocRefStyles.ResourceFetchInfoContainer>
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
