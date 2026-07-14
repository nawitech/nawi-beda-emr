import { Trans } from '@lingui/macro';
import { Badge, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import { MedicationDispense, MedicationRequest, Patient, Task } from 'fhir/r4b';

import { SearchBarColumn, SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { navigationAction } from '@beda.software/emr/dist/uberComponents/ResourceListPage/actions';
import type { RecordType } from '@beda.software/emr/dist/uberComponents/ResourceListPage/types';
import { ResourceListPage } from '@beda.software/emr/uberComponents';
import { formatHumanDateTime, renderHumanName } from '@beda.software/emr/utils';

import { collect, medicationName, MEDICATIONS_DUE_SEARCH_PARAMS, pharmacyStatus, PharmacyStage } from './service';

const STAGE_BADGE: Record<PharmacyStage, 'success' | 'warning' | 'default' | 'error'> = {
    delivered: 'success',
    filled: 'warning',
    received: 'default',
    unknown: 'error',
};

export function MedicationsDue() {
    const getFilters = (): SearchBarColumn[] => [
        {
            id: 'subject',
            searchParam: 'subject',
            type: SearchBarColumnType.REFERENCE,
            placeholder: 'Filter by patient',
            expression: 'Patient',
            path: "name.given.first() + ' ' + name.family",
        },
    ];

    const getTableColumns = (): ColumnsType<RecordType<MedicationRequest>> => [
        {
            title: <Trans>Patient</Trans>,
            key: 'patient',
            render: (_text, { resource, bundle }) => {
                const reference = resource.subject?.reference;
                const patient = collect<Patient>(bundle, 'Patient').find(
                    (candidate) => `Patient/${candidate.id}` === reference,
                );

                return renderHumanName(patient?.name?.[0]) || '—';
            },
        },
        {
            title: <Trans>Medication</Trans>,
            key: 'medication',
            render: (_text, { resource }) => medicationName(resource),
        },
        {
            title: <Trans>Dosage</Trans>,
            key: 'dosage',
            render: (_text, { resource }) => resource.dosageInstruction?.[0]?.text ?? '—',
        },
        {
            title: <Trans>Pharmacy status</Trans>,
            key: 'pharmacy',
            width: 340,
            render: (_text, { resource, bundle }) => {
                const status = pharmacyStatus(
                    resource,
                    collect<Task>(bundle, 'Task'),
                    collect<MedicationDispense>(bundle, 'MedicationDispense'),
                );

                return (
                    <Tooltip
                        title={
                            status.at
                                ? `${formatHumanDateTime(status.at)}${status.location ? ` · ${status.location}` : ''}`
                                : undefined
                        }
                    >
                        <Badge status={STAGE_BADGE[status.stage]} text={status.label} />
                    </Tooltip>
                );
            },
        },
        {
            title: <Trans>Ordered</Trans>,
            key: 'ordered',
            width: 160,
            render: (_text, { resource }) => (resource.authoredOn ? formatHumanDateTime(resource.authoredOn) : '—'),
        },
    ];

    return (
        <ResourceListPage<MedicationRequest>
            headerTitle="Medications due"
            resourceType="MedicationRequest"
            searchParams={MEDICATIONS_DUE_SEARCH_PARAMS}
            getFilters={getFilters}
            getTableColumns={getTableColumns}
            getRecordActions={(record) => [
                navigationAction(
                    'Open patient record',
                    `/patients/${record.resource.subject?.reference?.split('/')[1]}`,
                ),
            ]}
            getReportColumns={(bundle) => [{ title: 'Active medication orders', value: bundle.total ?? '—' }]}
        />
    );
}
