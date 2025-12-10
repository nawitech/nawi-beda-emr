import { Patient } from 'fhir/r4b';

import type { Dashboard, DashboardInstance } from '@beda.software/emr/dist/components/Dashboard/types';
import { StandardCardContainerFabric } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/containers/StandardCardContainerFabric/index';
import config from '@beda.software/emr-config';

import { DocRrefContainer } from './containers/DocRefContainer';
import { SummaryContainer } from './containers/SummaryContainer';
import {
    prepareAllergies,
    prepareConditions,
    prepareImmunizations,
    prepareMedicationStatements,
    prepareObservations,
    prepareProcedures,
    prepareRelatedPersons,
    prepareMedicationRequests,
} from '../utils';

const patientDashboardConfig: DashboardInstance = {
    top: [
        ...(config.baseURL === 'https://aucore.aidbox.beda.software' ? [{
            widget: DocRrefContainer,
        }] : []),
        ...(config.baseURL === 'https://bps-interop-practicegateway-connectathon-fhir-api.deva.svc.bpcloud.dev/api/interop/r4/fhir/' ? [{
            widget: SummaryContainer,
        }] : []),
        ...(config.baseURL === 'https://api.stage.haloconnect.io/integrator/sites/63255e8a-d04a-42a6-8c75-90aa880ad94e/fhir/R4/' ? [{
            widget: SummaryContainer,
        }] : []),
        ...(config.baseURL === 'https://alexapiuat.medtechglobal.com/FHIR' ? [{
            widget: SummaryContainer,
        }] : []),
        ...(config.baseURL === 'https://api-v1.test.medirecords.com/fhir/v1' ? [{
            widget: SummaryContainer,
        }] : []),
        ...(config.baseURL === 'https://smile.sparked-fhir.com/aucore/fhir/DEFAULT/' ? [{
            widget: SummaryContainer,
        }] : []),
        ...(config.baseURL === 'https://fhir-xrp.digitalhealth.gov.au/fhir/' ? [{
            widget: SummaryContainer,
        }] : []),
        ...(config.baseURL === 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/' ? [{
            widget: SummaryContainer,
        }] : []),
        {
            query: {
                resourceType: 'AllergyIntolerance',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareAllergies),
        },
        {
            query: {
                resourceType: 'Condition',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareConditions),
        },
        {
            query: {
                resourceType: 'Observation',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareObservations),
        },
        {
            query: {
                resourceType: 'Immunization',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareImmunizations),
        },
        {
            query: {
                resourceType: 'MedicationStatement',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareMedicationStatements),
        },
        {
            query: {
                resourceType: 'MedicationRequest',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareMedicationRequests),
        },
        {
            query: {
                resourceType: 'Procedure',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareProcedures),
        },
        {
            query: {
                resourceType: 'RelatedPerson',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareRelatedPersons),
        },
    ],
    left: [],
    right: [],
    bottom: [],
};

export const dashboard: Dashboard = {
    default: patientDashboardConfig,
};
