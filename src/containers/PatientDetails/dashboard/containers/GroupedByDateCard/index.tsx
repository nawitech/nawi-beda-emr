import { Collapse, Table } from 'antd';
import { Condition, MedicationRequest, Observation, Procedure, Resource } from 'fhir/r4b';

import { DashboardCard, Spinner } from '@beda.software/emr/components';
import type { ContainerProps } from '@beda.software/emr/dist/components/Dashboard/types';
import type {
    OverviewCard,
    PrepareFunction,
} from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/components/StandardCard/types';
import { StandardCard } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/components/StandardCard/index';
import { useStandardCard } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/containers/StandardCardContainerFabric/hooks';
import { formatHumanDate } from '@beda.software/emr/utils';
import { RenderRemoteData } from '@beda.software/fhir-react';

// The calendar day an observation belongs to, as YYYY-MM-DD.
export const observationRawDate = (r: Observation) => r.effectiveDateTime ?? r.issued ?? r.meta?.lastUpdated;

export const medicationRequestRawDate = (r: MedicationRequest) => r.authoredOn ?? r.meta?.lastUpdated;
export const procedureRawDate = (r: Procedure) =>
    r.performedDateTime ?? r.performedPeriod?.start ?? r.meta?.lastUpdated;
export const conditionRawDate = (r: Condition) => r.recordedDate ?? r.onsetDateTime ?? r.meta?.lastUpdated;

function groupByDay<T extends Resource>(rows: T[], getDate: (r: T) => string | undefined) {
    const groups = new Map<string, T[]>();
    for (const row of rows) {
        const day = getDate(row)?.slice(0, 10) ?? 'unknown';
        groups.set(day, [...(groups.get(day) ?? []), row]);
    }
    // Newest day first.
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function GroupedByDateCardContainerFabric<T extends Resource>(
    prepareFunction: PrepareFunction<T>,
    getDate: (resource: T) => string | undefined,
) {
    return function GroupedByDateCardContainer(props: ContainerProps) {
        const { patient, widgetInfo } = props;
        const { response, manager, countNumber } = useStandardCard(patient, widgetInfo.query!, prepareFunction);

        return (
            <RenderRemoteData remoteData={response} renderLoading={Spinner}>
                {({ card }) => {
                    const c = card as OverviewCard<T>;

                    if (c.data.length === 0) {
                        return (
                            <StandardCard
                                card={c}
                                patient={patient}
                                reload={manager.reload}
                                seeAllThreshold={countNumber}
                            />
                        );
                    }

                    const columns = c.columns
                        .filter((col) => col.title !== 'Date')
                        .map((col) => ({
                            title: col.title,
                            key: col.key,
                            width: col.width,
                            render: (_value: unknown, record: T) => col.render(record),
                        }));
                    const groups = groupByDay(c.data, getDate);

                    return (
                        <DashboardCard title={c.title} icon={c.icon}>
                            <Collapse
                                items={groups.map(([day, rows]) => ({
                                    key: day,
                                    label: day === 'unknown' ? 'Unknown date' : formatHumanDate(day),
                                    children: (
                                        <Table
                                            size="small"
                                            pagination={false}
                                            rowKey={(r) => c.getKey(r)}
                                            columns={columns}
                                            dataSource={rows}
                                        />
                                    ),
                                }))}
                            />
                        </DashboardCard>
                    );
                }}
            </RenderRemoteData>
        );
    };
}
