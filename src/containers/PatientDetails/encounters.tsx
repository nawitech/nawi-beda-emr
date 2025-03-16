import { PlusOutlined } from '@ant-design/icons';
import { t, Trans } from '@lingui/macro';
import { Encounter, Patient } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { navigationAction, questionnaireAction } from '@beda.software/emr/uberComponents';
import { ResourceListPageContent } from '@beda.software/emr/dist/uberComponents/ResourceListPageContent/index';
import { formatPeriodDateTime } from '@beda.software/emr/dist/utils/index';

export function PatientEncounter({ patient }: { patient: Patient }) {
    return (
        <ResourceListPageContent<Encounter>
            resourceType="Encounter"
            searchParams={{ patient: patient.id! }}
            getTableColumns={() => [
                {
                    title: 'Class',
                    dataIndex: 'class',
                    key: 'class',
                    render: (_text: any, { resource }) => resource.class.display ?? 'N/A',
                },
                {
                    title: 'Provider',
                    dataIndex: 'provider',
                    key: 'provider',
                    render: (_text: any, { resource }) => resource.serviceProvider?.display ?? 'N/A',
                },
                {
                    title: 'Period',
                    dataIndex: 'period',
                    key: 'period',
                    width: 250,
                    render: (_text: any, { resource }) => formatPeriodDateTime(resource.period),
                },
                {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (_text: any, { resource }) => {
                        return resource.status;
                    },
                },
            ]}
            getFilters={() => [
                {
                    id: 'name',
                    searchParam: '_ilike',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`Find encounter`,
                    placement: ['search-bar', 'table'],
                },
                {
                    id: 'status',
                    searchParam: 'status',
                    type: SearchBarColumnType.CHOICE,
                    placeholder: t`Choose status`,
                    options: [
                        {
                            value: {
                                Coding: {
                                    code: 'in-progress',
                                    display: 'In progress',
                                },
                            },
                        },
                        {
                            value: {
                                Coding: {
                                    code: 'finished',
                                    display: 'Finished',
                                },
                            },
                        },
                    ],
                    placement: ['table', 'search-bar'],
                },
            ]}
            getRecordActions={(record) => [navigationAction('Open', `/patients2/${record.resource.id}/encounter`)]}
            getHeaderActions={() => [
                questionnaireAction(<Trans>Create encounter</Trans>, 'encounter-create', { icon: <PlusOutlined /> }),
            ]}
            getBatchActions={() => [questionnaireAction(<Trans>Finish encounters</Trans>, '')]}
            getReportColumns={(bundle) => [
                {
                    title: t`Number of Encounters`,
                    value: bundle.total,
                },
            ]}
        />
    );
}
