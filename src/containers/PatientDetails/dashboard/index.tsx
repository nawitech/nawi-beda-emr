import { Patient } from 'fhir/r4b';

import type { Dashboard, DashboardInstance } from '@beda.software/emr/dist/components/Dashboard/types';
import { StandardCardContainerFabric } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/containers/StandardCardContainerFabric/index';

import {
    prepareAllergies,
    prepareConditions,
    prepareImmunizations,
    prepareLabResults,
    prepareMedicationRequests,
    prepareMedicationStatements,
    prepareObservations,
    prepareProcedures,
    prepareRelatedPersons,
} from '../utils';
import {
    conditionRawDate,
    GroupedByDateCardContainerFabric,
    medicationRequestRawDate,
    observationRawDate,
    procedureRawDate,
} from './containers/GroupedByDateCard';

const patientDashboardConfig: DashboardInstance = {
    top: [
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
                    _sort: '-recorded-date',
                    _count: 50,
                }),
            },
            widget: GroupedByDateCardContainerFabric(prepareConditions, conditionRawDate),
        },
        {
            query: {
                resourceType: 'Observation',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    'category:not': 'laboratory',
                    _sort: '-date',
                    _count: 50,
                }),
            },
            widget: GroupedByDateCardContainerFabric(prepareObservations, observationRawDate),
        },
        {
            query: {
                resourceType: 'Observation',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    category: 'laboratory',
                    _sort: '-date',
                    _count: 50,
                }),
            },
            widget: GroupedByDateCardContainerFabric(prepareLabResults, observationRawDate),
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
                    _sort: '-authoredon',
                    _count: 50,
                }),
            },
            widget: GroupedByDateCardContainerFabric(prepareMedicationRequests, medicationRequestRawDate),
        },
        {
            query: {
                resourceType: 'Procedure',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    _sort: '-date',
                    _count: 50,
                }),
            },
            widget: GroupedByDateCardContainerFabric(prepareProcedures, procedureRawDate),
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
