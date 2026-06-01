import { Bundle, Encounter, Patient } from 'fhir/r4b';

import { ResourceDetailPage, Tab } from '@beda.software/emr/dist/uberComponents/ResourceDetailPage/index';
import { compileAsFirst, formatPeriodDateTime } from '@beda.software/emr/dist/utils/index';

import { EncounterOverview } from './EncounterOverview';

const getPatientName = compileAsFirst<Patient | undefined, string>(
    "Patient.name.given.first() + ' ' + Patient.name.family",
);
const getPatient = compileAsFirst<Bundle, Patient>("Bundle.entry.resource.where(resourceType='Patient')");

const tabs: Array<Tab<Encounter>> = [
    {
        path: '',
        label: 'Overview',
        component: ({ resource }) => <EncounterOverview encounter={resource} />,
    },
];

function getName(resource: Encounter, bundle: Bundle) {
    const patient = getPatient(bundle);
    const patientName = getPatientName(patient) ?? 'Unknown';

    const period = formatPeriodDateTime(resource.period);
    return `${patientName} - ${period}`;
}

export function EncounterPage() {
    return (
        <ResourceDetailPage<Encounter>
            resourceType="Encounter"
            getSearchParams={({ encounter, id }) => ({
                _id: encounter,
                patient: id,
                _include: ['Encounter:patient', 'Encounter:practitioner'],
            })}
            getTitle={({ resource, bundle }) => getName(resource, bundle) ?? 'N/A'}
            tabs={tabs}
        />
    );
}
