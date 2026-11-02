import { t, Trans } from '@lingui/macro';
import { Tag } from 'antd';
import { Bundle, Encounter, Patient, Task } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage, questionnaireAction } from '@beda.software/emr/uberComponents';
import {
    formatHumanDateTime,
    getPersonAge,
    getResourceClinicalContext,
    renderHumanName,
    resolveReference,
} from '@beda.software/emr/utils';

import { OPD_TASK_CODE_SYSTEM, OPD_WORKFLOW_STATUS_SYSTEM } from 'src/utils/workflow';

/**
 * One station's work queue.
 *
 * Every OPD station has the same shape: list the `ready` Tasks carrying this station's code,
 * show who is waiting, and launch the form that does the work. The form's mapping completes
 * the Task and creates the next one in the same transaction, so the queue empties because
 * state moved — never because the browser navigated. See docs/opd-triage-workflow.md.
 *
 * `_include` pulls the patient and the encounter into the same bundle, so `getClinicalContext`
 * can hand the launched questionnaire exactly the launch variables it declares without a
 * lookup per row.
 */

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    stat: { label: 'Emergency', color: 'red' },
    urgent: { label: 'Urgent', color: 'orange' },
    routine: { label: 'Routine', color: 'default' },
};

function findPatient(task: Task, bundle: Bundle): Patient | undefined {
    return task.for ? resolveReference<Patient>(bundle, task.for) : undefined;
}

function findEncounter(task: Task, bundle: Bundle): Encounter | undefined {
    if (task.focus?.reference?.startsWith('Encounter/')) {
        return resolveReference<Encounter>(bundle, task.focus);
    }
    return undefined;
}

export interface OpdStation {
    /** Task.code for this station, e.g. `triage` or `consultation`. */
    taskCode: string;
    /** Questionnaire launched for a queued item. Omit while a station has no form yet. */
    questionnaireId?: string;
    actionTitle?: string;
}

export interface OpdQueueProps {
    /**
     * Stations shown in this queue. Usually one. The clinician's queue lists two — new
     * consultations and post-laboratory reviews — because they are the same person doing
     * the same job at different points in the visit, and one worklist beats two.
     */
    stations: OpdStation[];
    headerTitle: string;
    emptyReportTitle: string;
}

function stationOf(task: Task, stations: OpdStation[]): OpdStation | undefined {
    const code = task.code?.coding?.find(({ system }) => system === OPD_TASK_CODE_SYSTEM)?.code;
    return stations.find((station) => station.taskCode === code);
}

export function OpdQueue({ stations, headerTitle, emptyReportTitle }: OpdQueueProps) {
    return (
        <ResourceListPage<Task>
            headerTitle={headerTitle}
            resourceType="Task"
            searchParams={{
                // Comma-separated tokens are an OR in FHIR search, so one query serves every
                // station in this queue.
                code: stations.map(({ taskCode }) => `${OPD_TASK_CODE_SYSTEM}|${taskCode}`).join(','),
                status: 'ready',
                _include: ['Task:patient', 'Task:focus:Encounter'],
                _sort: 'authored-on',
            }}
            getClinicalContext={(record) => {
                if (!record) {
                    return [];
                }

                const patient = findPatient(record.resource, record.bundle);
                const encounter = findEncounter(record.resource, record.bundle);

                return [
                    ...(patient ? getResourceClinicalContext('Patient', patient) : []),
                    ...(encounter ? getResourceClinicalContext('Encounter', encounter) : []),
                ];
            }}
            getTableColumns={() => [
                {
                    title: <Trans>Priority</Trans>,
                    dataIndex: 'priority',
                    key: 'priority',
                    render: (_text, { resource }) => {
                        const priority = PRIORITY_LABELS[resource.priority ?? 'routine'];
                        return <Tag color={priority?.color}>{priority?.label ?? resource.priority}</Tag>;
                    },
                    width: 120,
                },
                {
                    title: <Trans>Patient</Trans>,
                    dataIndex: 'patient',
                    key: 'patient',
                    render: (_text, { resource, bundle }) =>
                        renderHumanName(findPatient(resource, bundle)?.name?.[0]) || resource.for?.reference,
                    width: 240,
                },
                {
                    title: <Trans>Age</Trans>,
                    dataIndex: 'age',
                    key: 'age',
                    render: (_text, { resource, bundle }) => {
                        const birthDate = findPatient(resource, bundle)?.birthDate;
                        return birthDate ? getPersonAge(birthDate) : null;
                    },
                    width: 100,
                },
                {
                    title: <Trans>Visit</Trans>,
                    dataIndex: 'visit',
                    key: 'visit',
                    render: (_text, { resource, bundle }) => {
                        const encounter = findEncounter(resource, bundle);
                        return encounter?.type?.[0]?.coding?.[0]?.display ?? encounter?.status;
                    },
                    width: 180,
                },
                {
                    title: <Trans>Waiting since</Trans>,
                    dataIndex: 'authoredOn',
                    key: 'authoredOn',
                    render: (_text, { resource }) =>
                        resource.authoredOn ? formatHumanDateTime(resource.authoredOn) : null,
                    width: 190,
                },
                {
                    title: <Trans>Stage</Trans>,
                    dataIndex: 'businessStatus',
                    key: 'businessStatus',
                    render: (_text, { resource }) =>
                        resource.businessStatus?.coding?.find(({ system }) => system === OPD_WORKFLOW_STATUS_SYSTEM)
                            ?.display ?? resource.businessStatus?.text,
                    width: 200,
                },
            ]}
            getFilters={() => [
                {
                    id: 'priority',
                    searchParam: 'priority',
                    type: SearchBarColumnType.CHOICE,
                    placeholder: t`Priority`,
                    options: [
                        { value: { Coding: { code: 'stat', display: 'Emergency' } } },
                        { value: { Coding: { code: 'urgent', display: 'Urgent' } } },
                        { value: { Coding: { code: 'routine', display: 'Routine' } } },
                    ],
                    placement: ['table', 'search-bar'],
                },
            ]}
            getRecordActions={({ resource }) => {
                // The action depends on which station the row belongs to, so a mixed queue
                // offers the right form per row.
                const station = stationOf(resource, stations);
                return station?.questionnaireId
                    ? [questionnaireAction(station.actionTitle ?? t`Open`, station.questionnaireId)]
                    : [];
            }}
            getReportColumns={(bundle) => [{ title: emptyReportTitle, value: bundle.total }]}
        />
    );
}
