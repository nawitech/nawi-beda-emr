import { DownloadOutlined, MailOutlined } from '@ant-design/icons';
import { t, Trans } from '@lingui/macro';
import { Button, Card, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import { Bundle, Encounter, Patient, Practitioner } from 'fhir/r4b';
import { useEffect, useState } from 'react';

import { SearchBarColumn } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage } from '@beda.software/emr/uberComponents';
import type { RecordType } from '@beda.software/emr/dist/uberComponents/ResourceListPage/types';
import { formatHumanDateTime, renderHumanName } from '@beda.software/emr/utils';

import { buildMailtoUrl, downloadCSV, ReportSnapshot, toCSV } from './export';
import { aggregateClinicalActivity, ActivityAggregate, CLINICAL_ACTIVITY_SEARCH_PARAMS } from './service';

interface ActivityReportProps {
    title: string;
    period: string;
    searchParams?: Record<string, string | number | boolean>;
    filters?: SearchBarColumn[];
}

export function ActivityReport({ title, period, searchParams = {}, filters }: ActivityReportProps) {
    const getTableColumns = (): ColumnsType<RecordType<Encounter>> => [
        {
            title: <Trans>Patient</Trans>,
            key: 'patient',
            render: (_text, { resource, bundle }) => resolveName(bundle, resource.subject?.reference),
        },
        {
            title: <Trans>Clinician</Trans>,
            key: 'clinician',
            render: (_text, { resource, bundle }) =>
                (resource.participant ?? [])
                    .map((participant) => resolveName(bundle, participant.individual?.reference))
                    .filter((name) => name !== '—')
                    .join(', ') || '—',
        },
        {
            title: <Trans>Visit type</Trans>,
            key: 'type',
            render: (_text, { resource }) =>
                resource.type?.[0]?.text ?? resource.type?.[0]?.coding?.[0]?.display ?? '—',
        },
        {
            title: <Trans>Date</Trans>,
            key: 'date',
            width: 180,
            render: (_text, { resource }) =>
                resource.period?.start ? formatHumanDateTime(resource.period.start) : '—',
        },
    ];

    return (
        <ResourceListPage<Encounter>
            headerTitle={title}
            resourceType="Encounter"
            searchParams={{ ...CLINICAL_ACTIVITY_SEARCH_PARAMS, ...searchParams }}
            getTableColumns={getTableColumns}
            getFilters={filters ? () => filters : undefined}
            getHeaderActions={() => []}
            getReportColumns={(bundle) => [
                {
                    title: t`Total visits completed by clinical staff`,
                    value: bundle.total ?? '—',
                },
                {
                    title: t`Unique patients seen by clinical staff`,
                    value: <UniquePatients bundle={bundle} />,
                },
                {
                    title: t`Export`,
                    value: <ExportActions bundle={bundle} title={title} period={period} />,
                },
            ]}
            tableProps={{
                footer: (rows) =>
                    rows.length ? <ClinicianBreakdown bundle={(rows[0] as RecordType<Encounter>).bundle} /> : null,
            }}
        />
    );
}

function resolveName(bundle: Bundle, reference: string | undefined): string {
    if (!reference) {
        return '—';
    }

    const [resourceType, id] = reference.split('/');
    const match = (bundle.entry ?? []).find(
        (entry) => entry.resource?.resourceType === resourceType && entry.resource.id === id,
    )?.resource as Patient | Practitioner | undefined;

    return renderHumanName(match?.name?.[0]) || (id ?? '—');
}

function useActivityAggregate(bundle: Bundle) {
    const [aggregate, setAggregate] = useState<ActivityAggregate | null>(null);
    const selfUrl = bundle.link?.find((link) => link.relation === 'self')?.url;

    useEffect(() => {
        let cancelled = false;

        aggregateClinicalActivity(bundle).then((result) => {
            if (!cancelled) {
                setAggregate(result);
            }
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selfUrl]);

    return aggregate;
}

function UniquePatients({ bundle }: { bundle: Bundle }) {
    const aggregate = useActivityAggregate(bundle);

    if (!aggregate) {
        return <>—</>;
    }

    return (
        <Space direction="vertical" size={0}>
            <span>{aggregate.uniquePatients}</span>
            {aggregate.truncated ? (
                <Typography.Text type="warning" style={{ fontSize: 11 }}>
                    <Trans>
                        counted from the first {aggregate.scanned} of {aggregate.total} encounters
                    </Trans>
                </Typography.Text>
            ) : null}
        </Space>
    );
}

function ClinicianBreakdown({ bundle }: { bundle: Bundle }) {
    const aggregate = useActivityAggregate(bundle);

    if (!aggregate || !Object.keys(aggregate.byPractitioner).length) {
        return null;
    }

    const rows = Object.entries(aggregate.byPractitioner)
        .map(([reference, stats]) => {
            const id = reference.replace('Practitioner/', '');
            const practitioner = (bundle.entry ?? [])
                .map((entry) => entry.resource)
                .find(
                    (resource): resource is Practitioner =>
                        resource?.resourceType === 'Practitioner' && resource.id === id,
                );

            return {
                key: reference,
                clinician: renderHumanName(practitioner?.name?.[0]) || id,
                patients: stats.patients,
                visits: stats.visits,
            };
        })
        .sort((a, b) => b.visits - a.visits);

    return (
        <Card size="small" title={<Trans>By clinician</Trans>} style={{ marginTop: 16 }}>
            <Table
                size="small"
                pagination={false}
                dataSource={rows}
                columns={[
                    { title: <Trans>Clinician</Trans>, dataIndex: 'clinician', key: 'clinician' },
                    {
                        title: <Trans>Unique patients</Trans>,
                        dataIndex: 'patients',
                        key: 'patients',
                        width: 160,
                        align: 'right',
                    },
                    {
                        title: <Trans>Visits</Trans>,
                        dataIndex: 'visits',
                        key: 'visits',
                        width: 120,
                        align: 'right',
                    },
                ]}
            />
        </Card>
    );
}

function ExportActions({ bundle, title, period }: { bundle: Bundle; title: string; period: string }) {
    const aggregate = useActivityAggregate(bundle);

    const snapshot: ReportSnapshot = {
        title,
        period,
        totalVisits: bundle.total ?? '—',
        aggregate,
    };

    return (
        <Space>
            <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadCSV(toCSV(snapshot), `${title.replace(/\W+/g, '-').toLowerCase()}.csv`)}
            >
                <Trans>CSV</Trans>
            </Button>
            <Button
                size="small"
                icon={<MailOutlined />}
                onClick={() => {
                    window.location.href = buildMailtoUrl(snapshot);
                }}
            >
                <Trans>Email</Trans>
            </Button>
        </Space>
    );
}
