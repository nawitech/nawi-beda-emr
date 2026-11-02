import { PlusOutlined } from '@ant-design/icons';
import { t, Trans } from '@lingui/macro';
import { Patient } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage, navigationAction, questionnaireAction } from '@beda.software/emr/uberComponents';
import { renderHumanName, formatHumanDate } from '@beda.software/emr/utils';

import { renderIdentifier } from 'src/utils';
import { hasRole, Role } from 'src/utils/role';

export function PatientResourceList() {
    // Reception owns the patient register and opens visits; an administrator keeps the same
    // powers for back-office correction. Clinical stations look patients up, nothing more.
    const canRegister = hasRole(Role.Receptionist, Role.Administrator);

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
                    title: 'Ids',
                    dataIndex: 'identifier',
                    key: 'identifier',
                    render: (_text, { resource }) => {
                        return (
                            <ul>
                                {resource.identifier?.map((identifier) => (
                                    <li key={identifier.value}>{renderIdentifier(identifier)}</li>
                                ))}
                            </ul>
                        );
                    },
                    width: 250,
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
                // Opening a visit is reception's job, and it is the only OPD form launched
                // from the patient list: every later station works from its own queue, where
                // the row carries the Encounter its questionnaire needs. Triage in
                // particular must not be launched here — it has no visit to attach to.
                ...(canRegister
                    ? [
                          questionnaireAction(<Trans>Start visit</Trans>, 'opd-start-visit'),
                          questionnaireAction(<Trans>Edit</Trans>, 'patient-edit'),
                      ]
                    : []),
            ]}
            getHeaderActions={() =>
                canRegister
                    ? [
                          questionnaireAction(<Trans>Add patient</Trans>, 'patient-create', {
                              icon: <PlusOutlined />,
                          }),
                      ]
                    : []
            }
            getBatchActions={() =>
                hasRole(Role.Administrator)
                    ? [questionnaireAction(<Trans>Delete patients</Trans>, 'patients-batch-delete')]
                    : []
            }
            getReportColumns={(bundle) => [
                {
                    title: t`Number of Patients`,
                    value: bundle.total,
                },
            ]}
        />
    );
}
