import { Patient } from 'fhir/r4b';

import type { Dashboard, DashboardInstance } from '@beda.software/emr/dist/components/Dashboard/types';
import { StandardCardContainerFabric } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/containers/StandardCardContainerFabric/index';
import { questionnaireAction } from '@beda.software/emr/dist/uberComponents/ResourceListPage/actions';

import {
    prepareAllergies,
    prepareConditions,
    prepareConsents,
    prepareEncounters,
    prepareImmunizations,
    prepareMedicationRequests,
    prepareMedicationStatements,
    prepareObservations,
    prepareProcedures,
    prepareRelatedPersons,
    prepareServiceRequests,
} from '../utils';
import { getAuthorLaunchContext } from './launchContext';

const patientDashboardConfig: DashboardInstance = {
    top: [
        {
            query: {
                resourceType: 'Encounter',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    _sort: '-date',
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareEncounters, {
                action: questionnaireAction('Document visit', 'clinic-visit-note'),
                getLaunchContext: getAuthorLaunchContext,
            }),
        },
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
                resourceType: 'MedicationRequest',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareMedicationRequests, {
                action: questionnaireAction('Prescribe', 'prescribe-medication'),
                getLaunchContext: getAuthorLaunchContext,
            }),
        },
        {
            query: {
                resourceType: 'Immunization',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareImmunizations, {
                action: questionnaireAction('Administer vaccine', 'administer-immunization'),
                getLaunchContext: getAuthorLaunchContext,
            }),
        },
        {
            query: {
                resourceType: 'ServiceRequest',
                search: (patient: Patient) => ({
                    subject: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareServiceRequests, {
                action: questionnaireAction('Refer to specialist', 'specialist-referral'),
                getLaunchContext: getAuthorLaunchContext,
            }),
        },
        {
            query: {
                resourceType: 'Consent',
                search: (patient: Patient) => ({
                    patient: patient.id,
                    _count: 7,
                }),
            },
            widget: StandardCardContainerFabric(prepareConsents, {
                action: questionnaireAction('Capture consent', 'data-sharing-consent'),
                getLaunchContext: getAuthorLaunchContext,
            }),
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
