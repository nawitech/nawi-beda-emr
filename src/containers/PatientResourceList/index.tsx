import { PlusOutlined } from '@ant-design/icons';
import { t, Trans } from '@lingui/macro';
import { Patient } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage, navigationAction, questionnaireAction } from '@beda.software/emr/uberComponents';
import { renderHumanName, formatHumanDate } from '@beda.software/emr/utils';

import { renderIdentifier } from 'src/utils';

function age(birthDate: string): number {
    const born = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - born.getFullYear();
    const hadBirthday =
        now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());

    return hadBirthday ? years : years - 1;
}

export function PatientResourceList() {
    return (
        <ResourceListPage<Patient>
            headerTitle={t`Patients`}
            resourceType="Patient"
            searchParams={{ _total: 'accurate', _count: 10 }}
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
                    title: <Trans>Age</Trans>,
                    key: 'age',
                    render: (_text, { resource }) => (resource.birthDate ? `${age(resource.birthDate)}` : '—'),
                    width: 80,
                },
                {
                    title: <Trans>Gender</Trans>,
                    dataIndex: 'gender',
                    key: 'gender',
                    render: (_text, { resource }) => resource.gender,
                    width: 110,
                },
                {
                    title: <Trans>MRN</Trans>,
                    dataIndex: 'identifier',
                    key: 'identifier',
                    render: (_text, { resource }) =>
                        resource.identifier?.map((identifier) => (
                            <div key={identifier.value}>{renderIdentifier(identifier)}</div>
                        )) ?? '—',
                    width: 200,
                },
                {
                    title: <Trans>City</Trans>,
                    key: 'city',
                    render: (_text, { resource }) => {
                        const address = resource.address?.[0];

                        return address ? [address.city, address.state].filter(Boolean).join(', ') : '—';
                    },
                    width: 180,
                },
                {
                    title: <Trans>Language</Trans>,
                    key: 'language',
                    render: (_text, { resource }) =>
                        resource.communication?.find((c) => c.preferred)?.language?.coding?.[0]?.display ?? '—',
                    width: 120,
                },
            ]}
            getFilters={() => [
                {
                    id: 'identifier',
                    searchParam: 'identifier',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`MPI identifier`,
                    placement: ['table', 'search-bar'],
                },
                {
                    id: 'name',
                    searchParam: 'name',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`Find patient`,
                    placement: ['table'],
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
                questionnaireAction(<Trans>Add patient</Trans>, 'patient-create', {
                    icon: <PlusOutlined />,
                }),
            ]}
            getReportColumns={(bundle) => [
                {
                    title: t`Patients in panel`,
                    value: bundle.total ?? '—',
                },
            ]}
        />
    );
}
