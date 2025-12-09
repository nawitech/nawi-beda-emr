import { Bundle, Encounter, Patient } from 'fhir/r4b';

import { PatientApps } from '@beda.software/emr/dist/containers/PatientDetails/PatientApps/index';
import { DetailPage, Tab } from '@beda.software/emr/dist/uberComponents/DetailPage/index';
import { compileAsFirst, formatPeriodDateTime } from '@beda.software/emr/dist/utils/index';

import { EncounterOverview } from './EncounterOverview';
import config from '@beda.software/emr-config';

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

if (config.baseURL === 'https://smartonfhir.aidbox.beda.software') {
    tabs.push({
        path: 'smart',
        label: 'Smart Apps',
        component: ({ resource, bundle }) => <PatientApps patient={getPatient(bundle)!} encounter={resource} />,
    })
}

function getName(resource: Encounter, bundle: Bundle) {
    const patient = getPatient(bundle);
    const patientName = getPatientName(patient) ?? 'Unknown';

    const period = formatPeriodDateTime(resource.period);
    return `${patientName} - ${period}`;
}

export function EncounterPage() {
    return (
        <DetailPage<Encounter>
            resourceType="Encounter"
            getSearchParams={({ encounter, id }) => ({ _id: encounter, patient: id, _include: ['Encounter:patient', 'Encounter:practitioner'] })}
            getTitle={({ resource, bundle }) => getName(resource, bundle) ?? 'N/A'}
            tabs={tabs}
        />
    );
}
