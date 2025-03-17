
import { Patient } from 'fhir/r4b';

import type { Dashboard, DashboardInstance } from '@beda.software/emr/dist/components/Dashboard/types';
import { StandardCardContainerFabric } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/containers/StandardCardContainerFabric/index';
import {} from '@beda.software/emr/components'

import { DocRrefContainer } from './containers/DocRefContainer';
import { prepareAllergies, prepareConditions, prepareObservations } from '../utils';

const patientDashboardConfig: DashboardInstance = {
    top: [
        {
            widget: DocRrefContainer,
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
        }
    ],
    left: [],
    right: [],
    bottom: [],
};

export const dashboard: Dashboard = {
    default: patientDashboardConfig,
};
