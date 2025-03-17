import { FileOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Button, Typography } from 'antd';
import React from 'react';

import { DashboardCard, Spinner } from '@beda.software/emr/components';
import type { ContainerProps } from '@beda.software/emr/dist/components/Dashboard/types';
import { S } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/PatientOverview.styles';
import { formatHumanDateTime } from '@beda.software/emr/utils';
import { RenderRemoteData } from '@beda.software/fhir-react';
import { isSuccess, isLoading } from '@beda.software/remote-data';

import { useDocRefCard } from './hook';
import { parsePatientSummary } from './utils';

export function DocRrefContainer(props: ContainerProps) {
    const { latestSummaryDocRefResponse, docRefUpdateState, generateDocRef } = useDocRefCard(props.patient);
    const renderExtra = () => {
        return isSuccess(latestSummaryDocRefResponse) && latestSummaryDocRefResponse.data.docRef ? (
            <React.Fragment>
                <>
                    <span>Generated: {formatHumanDateTime(latestSummaryDocRefResponse.data.docRef.date!)}</span>
                    <Button type="primary" onClick={generateDocRef} loading={isLoading(docRefUpdateState)}>
                        Update
                    </Button>
                </>
            </React.Fragment>
        ) : (
            <Button type="primary" onClick={generateDocRef} loading={isLoading(docRefUpdateState)}>
                Generate new summary
            </Button>
        );
    };

    return (
        <DashboardCard title={t`Patient Summary`} extra={renderExtra()} icon={<FileOutlined />}>
            <S.DetailsRow>
                <RenderRemoteData remoteData={latestSummaryDocRefResponse} renderLoading={Spinner}>
                    {({ docRef, patientSummary }) => {
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {docRef ? (
                                    parsePatientSummary(patientSummary).map((item) => {
                                        return (
                                            <div key={item.title} style={{display: 'flex', flexDirection: 'column'}}>
                                                <Typography.Text strong>{item.title}</Typography.Text>
                                                <Typography.Text>{item.text}</Typography.Text>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <Typography.Text>No summary</Typography.Text>
                                )}
                            </div>
                        );
                    }}
                </RenderRemoteData>
            </S.DetailsRow>
        </DashboardCard>
    );
}
