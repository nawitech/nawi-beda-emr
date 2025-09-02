import { Patient } from 'fhir/r4b';

import { PatientDashboardProvider } from '@beda.software/emr/dist/components/Dashboard/contexts';
import { PatientOverview } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/index';
import { DetailPage, Tab } from '@beda.software/emr/dist/uberComponents/DetailPage/index';
import { compileAsFirst } from '@beda.software/emr/dist/utils/index';
import config from '@beda.software/emr-config';

import { dashboard } from './dashboard';
import { PatientEncounter } from './encounters';
import { PatientApps } from './PatientApps/index';
import { PatientServiceRequest } from './requests';
import { ResourcesTabRoutes } from './ResourcesTabRoutes';
import { useEffect } from 'react';
import { axiosInstance as axiosFHIRInstance } from '@beda.software/emr/services';

const getName = compileAsFirst<Patient, string>("Patient.name.given.first() + ' ' + Patient.name.family");

const tabs: Array<Tab<Patient>> = [
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

if (config.baseURL === 'https://erequesting.aidbox.beda.software') {
    tabs.push({
        path: 'service',
        label: 'Service requests',
        component: ({ resource }) => <PatientServiceRequest patient={resource} />,
    });
}

if (config.baseURL === 'https://smartonfhir.aidbox.beda.software') {
    tabs.push({
        path: 'smart',
        label: 'Smart Apps',
        component: ({ resource }) => <PatientApps patient={resource} />,
    });
}

export function PatientDetails() {
    useEffect(() => {
        axiosFHIRInstance.defaults.headers['Ocp-Apim-Subscription-Key'] = `923b7ac4add44b02be0e93d3303e55e1`;
    }, []);

    return (
        <PatientDashboardProvider dashboard={dashboard}>
            <DetailPage<Patient>
                resourceType="Patient"
                getSearchParams={({ id }) => ({ _id: id })}
                getTitle={({ resource, bundle }) => getName(resource, { bundle })!}
                tabs={tabs}
            />
        </PatientDashboardProvider>
    );
}
