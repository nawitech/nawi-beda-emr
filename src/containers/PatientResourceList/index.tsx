import { PlusOutlined } from '@ant-design/icons';
import { t, Trans } from '@lingui/macro';
import { Patient } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import {
    ResourceListPage,
    navigationAction,
    questionnaireAction,
} from '@beda.software/emr/uberComponents';
import { renderHumanName, formatHumanDate } from '@beda.software/emr/utils';

export function PatientResourceList() {
    return (
        <ResourceListPage<Patient>
            headerTitle={t`Patients`}
            resourceType="Patient"
            getTableColumns={() => [
                {
                    title: <Trans>Name</Trans>,
                    dataIndex: 'name',
                    key: 'name',
                    render: (_text, { resource }) => renderHumanName(resource.name?.[0]),
                    width: 300,
                },
                {
                    title: <Trans>Birth date</Trans>,
                    dataIndex: 'birthDate',
                    key: 'birthDate',
                    render: (_text, { resource }) => (resource.birthDate ? formatHumanDate(resource.birthDate) : null),
                    width: 150,
                },
                {
                    title: <Trans>Gender</Trans>,
                    dataIndex: 'gender',
                    key: 'gender',
                    render: (_text, { resource }) => resource.gender,
                    width: 150,
                },
                {
                    title: "Ids",
                    dataIndex: 'identifier',
                    key: 'identifier',
                    render: (_text, { resource }) =>{
                        return <ul>{resource.identifier?.map(identifier => (
                            <li key={identifier.value}>{
                                identifier.type?.text
                                ?? identifier.type?.coding?.[0].display
                                ?? identifier.type?.coding?.[0].code
                                ?? identifier.system
                            }: {identifier.value}</li>
                            ))}</ul>
                    },
                    width: 250,
                },
            ]}
            getFilters={() => [
                {
                    id: 'name',
                    searchParam: 'name',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`Find patient`,
                    placement: ['search-bar', 'table'],
                },
                {
                    id: 'birthDate',
                    searchParam: 'birthdate',
                    type: SearchBarColumnType.SINGLEDATE,
                    placeholder: t`Birth date`,
                    placement: ['table'],
                },
                {
                    id: 'gender',
                    searchParam: 'gender',
                    type: SearchBarColumnType.CHOICE,
                    placeholder: t`Choose gender`,
                    options: [
                        {
                            value: {
                                Coding: {
                                    code: 'male',
                                    display: 'Male',
                                },
                            },
                        },
                        {
                            value: {
                                Coding: {
                                    code: 'female',
                                    display: 'Female',
                                },
                            },
                        },
                    ],
                    placement: ['table'],
                },
            ]}
            getRecordActions={(record) => [
                navigationAction('Open', `/patients/${record.resource.id}`),
                questionnaireAction('Edit', 'patient-edit'),
            ]}
            getHeaderActions={() => [
                questionnaireAction(<Trans>Add patient</Trans>, 'patient-create', { icon: <PlusOutlined /> }),
            ]}
            getBatchActions={() => [questionnaireAction(<Trans>Delete patients</Trans>, 'patients-batch-delete')]}
            getReportColumns={(bundle) => [
                {
                    title: t`Number of Patients`,
                    value: bundle.total,
                },
            ]}
        ></ResourceListPage>
    );
}
