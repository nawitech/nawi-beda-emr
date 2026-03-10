import { Patient } from 'fhir/r4b';
import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import { PageContainer } from '@beda.software/emr/dist/components/BaseLayout/PageContainer/index';
import { PatientDashboardProvider } from '@beda.software/emr/dist/components/Dashboard/contexts';
import { PatientDocument } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocument/index';
import { PatientDocumentDetails } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocumentDetails/index';
import { PatientDocuments } from '@beda.software/emr/dist/containers/PatientDetails/PatientDocuments/index';
import { PatientOverview } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/index';
import { PageTabs, ResourceDetailPage, Tab } from '@beda.software/emr/dist/uberComponents/ResourceDetailPage/index';
import { compileAsFirst, renderHumanName, selectCurrentUserRoleResource } from '@beda.software/emr/dist/utils/index';
import { axiosInstance as axiosFHIRInstance, service } from '@beda.software/emr/services';
import config from '@beda.software/emr-config';
import { RenderRemoteData, useService, WithId } from '@beda.software/fhir-react';

import { dashboard } from './dashboard';
import { PatientEncounter } from './encounters';
import { PatientApps } from './PatientApps/index';
import { PatientServiceRequest } from './requests';
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

if (config.baseURL === 'https://aucore.aidbox.beda.software') {
    tabs.push({
        path: 'documents',
        label: 'Documents',
        component: ({ resource }) => <Documents patient={resource} />,
    });
}

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
    const isEpic = config.baseURL === 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/';

    return (
        <PatientDashboardProvider dashboard={dashboard}>
            {isEpic ? (
                <EpicPatientDetails />
            ) : (
                <ResourceDetailPage<Patient>
                    resourceType="Patient"
                    getSearchParams={({ id }) => ({ _id: id })}
                    getTitle={({ resource, bundle }) => getName(resource, { bundle })!}
                    tabs={tabs}
                />
            )}
        </PatientDashboardProvider>
    );
}

function EpicPatientDetails() {
    const [response] = useService(() =>
        service<Patient>({
            method: 'GET',
            url: `/Patient/e0lof40pd7mW6R7f0v.4POw3`,
        }),
    );

    return (
        <RenderRemoteData remoteData={response}>
            {(patient) => {
                return (
                    <PageContainer
                        title={renderHumanName(patient.name?.[0])}
                        layoutVariant="with-tabs"
                        headerContent={<PageTabs tabs={tabs} />}
                    >
                        <Routes>
                            {tabs.map(({ path, component }) => (
                                <React.Fragment key={path}>
                                    <Route path={'/' + path} element={component({ resource: patient } as any)} />
                                    <Route path={'/' + path + '/*'} element={component({ resource: patient } as any)} />
                                </React.Fragment>
                            ))}
                        </Routes>
                    </PageContainer>
                );
            }}
        </RenderRemoteData>
    );
}

function Documents({ patient }: { patient: WithId<Patient> }) {
    const author = selectCurrentUserRoleResource();
    return (
        <Routes>
            <Route path="/" element={<PatientDocuments patient={patient} />} />
            <Route
                path="/new/:questionnaireId"
                element={
                    <PatientDocument
                        patient={patient}
                        author={author}
                        autoSave={true}
                        onSuccess={() => {
                            window.history.back();
                        }}
                    />
                }
            />
            <Route path="/:qrId/*" element={<PatientDocumentDetails patient={patient} />} />
        </Routes>
    );
}
