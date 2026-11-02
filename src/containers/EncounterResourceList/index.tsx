import { t, Trans } from '@lingui/macro';
import { Encounter, Patient, Practitioner } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage, navigationAction } from '@beda.software/emr/uberComponents';
import { formatPeriodDateTime, renderHumanName, resolveReference } from '@beda.software/emr/utils';

import { matchCurrentUserRole, Role } from 'src/utils/role';

/**
 * Nawi encounter list.
 *
 * This replaces Beda's own `EncounterList`, which cannot run here: it calls the upstream
 * `matchCurrentUserRole`, whose option map only has keys for the four upstream roles
 * (patient, admin, practitioner, receptionist). A Nawi role such as `clinician` resolves to
 * `undefined`, which is then invoked — the `d(...) is not a function` crash. Any upstream
 * container that touches `utils/role` has the same problem; see src/utils/role.ts.
 */

// Clinical staff all work the same OPD floor, so they see every encounter rather than only
// the ones they personally participate in — filtering by participant would hide the queue.
// The gateway's patient-compartment check still bounds what any of them can actually read.
function getRoleSearchParams(): Record<string, string> {
    try {
        return matchCurrentUserRole<Record<string, string>>({
            [Role.Receptionist]: () => ({}),
            [Role.TriageNurse]: () => ({}),
            [Role.Clinician]: () => ({}),
            [Role.LabTechnician]: () => ({}),
            [Role.Pharmacist]: () => ({}),
            [Role.Cashier]: () => ({}),
            [Role.Administrator]: () => ({}),
            [Role.Patient]: (patient) => ({ subject: `Patient/${patient.id}` }),
        });
    } catch {
        return {};
    }
}

export function EncounterResourceList() {
    return (
        <ResourceListPage<Encounter>
            headerTitle={t`Encounters`}
            resourceType="Encounter"
            searchParams={{
                ...getRoleSearchParams(),
                '_include:iterate': ['Encounter:subject', 'Encounter:participant:Practitioner'],
                _sort: '-date,_id',
            }}
            getTableColumns={() => [
                {
                    title: <Trans>Patient</Trans>,
                    dataIndex: 'patient',
                    key: 'patient',
                    render: (_text, { resource, bundle }) => {
                        if (!resource.subject) {
                            return null;
                        }
                        const patient = resolveReference<Patient>(bundle, resource.subject);
                        return renderHumanName(patient?.name?.[0]) || resource.subject.display;
                    },
                    width: 260,
                },
                {
                    title: <Trans>Practitioner</Trans>,
                    dataIndex: 'practitioner',
                    key: 'practitioner',
                    render: (_text, { resource, bundle }) => {
                        const individual = resource.participant?.[0]?.individual;
                        if (!individual) {
                            return null;
                        }
                        const practitioner = resolveReference<Practitioner>(bundle, individual);
                        return renderHumanName(practitioner?.name?.[0]) || individual.display;
                    },
                    width: 240,
                },
                {
                    title: <Trans>Status</Trans>,
                    dataIndex: 'status',
                    key: 'status',
                    render: (_text, { resource }) => resource.status,
                    width: 140,
                },
                {
                    title: <Trans>Date</Trans>,
                    dataIndex: 'date',
                    key: 'date',
                    render: (_text, { resource }) => formatPeriodDateTime(resource.period),
                    width: 220,
                },
            ]}
            getFilters={() => [
                {
                    id: 'status',
                    searchParam: 'status',
                    type: SearchBarColumnType.CHOICE,
                    placeholder: t`Status`,
                    options: [
                        { value: { Coding: { code: 'planned', display: 'Planned' } } },
                        { value: { Coding: { code: 'arrived', display: 'Arrived' } } },
                        { value: { Coding: { code: 'triaged', display: 'Triaged' } } },
                        { value: { Coding: { code: 'in-progress', display: 'In progress' } } },
                        { value: { Coding: { code: 'finished', display: 'Finished' } } },
                    ],
                    placement: ['table', 'search-bar'],
                },
                {
                    id: 'date',
                    searchParam: 'date',
                    type: SearchBarColumnType.SINGLEDATE,
                    placeholder: t`Date`,
                    placement: ['table'],
                },
            ]}
            getRecordActions={({ resource, bundle }) => {
                const patient = resource.subject ? resolveReference<Patient>(bundle, resource.subject) : undefined;
                return patient ? [navigationAction(t`Open patient`, `/patients/${patient.id}`)] : [];
            }}
            getReportColumns={(bundle) => [{ title: t`Encounters`, value: bundle.total }]}
        />
    );
}
