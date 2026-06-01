import { Patient } from 'fhir/r4b';

import { PatientDashboardProvider } from '@beda.software/emr/dist/components/Dashboard/contexts';
import { PatientOverview } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/index';
import { ResourceDetailPage, Tab } from '@beda.software/emr/dist/uberComponents/ResourceDetailPage/index';
import { compileAsFirst } from '@beda.software/emr/dist/utils/index';
import { WithId } from '@beda.software/fhir-react';

import { dashboard } from './dashboard';
import { PatientEncounter } from './encounters';
import { ResourcesTabRoutes } from './ResourcesTabRoutes';

const getName = compileAsFirst<Patient, string>("Patient.name.given.first() + ' ' + Patient.name.family");

const tabs: Array<Tab<WithId<Patient>>> = [
    {
        path: '',
        label: 'Overview',
        component: ({ resource }) => <PatientOverview patient={resource} />,
    },
    {
        path: 'encounter',
        label: 'Encounters',
        component: ({ resource }) => <PatientEncounter patient={resource} />,
    },
    {
        path: 'resources',
        label: 'Resources',
        component: () => <ResourcesTabRoutes />,
    },
];

export function PatientDetails() {
    return (
        <PatientDashboardProvider dashboard={dashboard}>
            <ResourceDetailPage<Patient>
                resourceType="Patient"
                getSearchParams={({ id }) => ({ _id: id })}
                getTitle={({ resource, bundle }) => getName(resource, { bundle })!}
                tabs={tabs}
                maxWidth="100%"
            />
        </PatientDashboardProvider>
    );
}
