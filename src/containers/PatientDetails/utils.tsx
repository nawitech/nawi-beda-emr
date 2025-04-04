import {
    AlertOutlined,
    CheckOutlined,
    ExperimentOutlined,
    HeartOutlined,
    MedicineBoxOutlined,
    SubnodeOutlined,
    UsergroupAddOutlined,
    ExceptionOutlined,
} from '@ant-design/icons';
import {
    Resource,
    AllergyIntolerance,
    Bundle,
    Condition,
    Immunization,
    MedicationStatement,
    Observation,
    Procedure,
    RelatedPerson,
    MedicationRequest,
} from 'fhir/r4b';

import type { OverviewCard } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/components/StandardCard/types';

import {
    makeRenderer,
    allergyName,
    allergyDate,
    conditionName,
    conditionDate,
    observationName,
    observationDate,
    observationValue,
    immunizationVaccine,
    immunizationDate,
    msMedication,
    msDosage,
    msDate,
    procedureTitle,
    procedureDate,
    rpName,
    rpRelationShip,
    mrName,
    mrReason,
    mrDosage,
    mrStatus,
} from './resourceDataGetters';


import { AvailableResourceTypesStr, MapResourceConfigType, UberListRT, DashboardRT } from './types';

export function getResourceConfigData<T extends Resource, RCM extends 'uberList' | 'dashboard'>(
    key: AvailableResourceTypesStr,
    renderColumnMode: RCM,
): typeof renderColumnMode extends 'uberList' ? UberListRT<T> : DashboardRT<T> {
    const mapResourceConfigs: MapResourceConfigType = {
        AllergyIntolerance: {
            title: 'Allergies',
            icon: <ExperimentOutlined />,
            columns: [
                {
                    title: `Name`,
                    key: 'name',
                    render: makeRenderer(allergyName, renderColumnMode),
                },
                {
                    title: `Date`,
                    key: 'date',
                    render: makeRenderer(allergyDate, renderColumnMode),
                    width: 120,
                },
            ],
        },
        Condition: {
            title: 'Conditions',
            icon: <AlertOutlined />,
            columns: [
                {
                    title: `Name`,
                    key: 'name',
                    render: makeRenderer(conditionName, renderColumnMode),
                },
                {
                    title: `Date`,
                    key: 'date',
                    render: makeRenderer(conditionDate, renderColumnMode),
                    width: 120,
                },
            ],
        },
        Observation: {
            title: 'Observations',
            icon: <HeartOutlined />,
            columns: [
                {
                    title: `Name`,
                    key: 'name',
                    render: makeRenderer(observationName, renderColumnMode),
                    width: 200,
                },
                {
                    title: `Date`,
                    key: 'date',
                    render: makeRenderer(observationDate, renderColumnMode),
                },
                {
                    title: `Value`,
                    key: 'value',
                    render: makeRenderer(observationValue, renderColumnMode),
                },
            ],
        },
        Immunization: {
            title: 'Immunizations',
            icon: <MedicineBoxOutlined />,
            columns: [
                {
                    title: `Vaccine`,
                    key: 'vaccine',
                    render: makeRenderer(immunizationVaccine, renderColumnMode),
                },
                {
                    title: `Date`,
                    key: 'date',
                    render: makeRenderer(immunizationDate, renderColumnMode),
                    width: 120,
                },
            ],
        },
        MedicationStatement: {
            title: 'Medications',
            icon: <CheckOutlined />,
            columns: [
                {
                    title: `Medication`,
                    key: 'medication',
                    render: makeRenderer(msMedication, renderColumnMode),
                },
                {
                    title: 'Dosage',
                    key: 'dosage',
                    render: makeRenderer(msDosage, renderColumnMode),
                },
                {
                    title: `Date`,
                    key: 'date',
                    render: makeRenderer(msDate, renderColumnMode),
                    width: 120,
                },
            ],
        },
        Procedure: {
            title: 'Procedures',
            icon: <SubnodeOutlined />,
            columns: [
                {
                    title: `Title`,
                    key: 'title',
                    render: makeRenderer(procedureTitle, renderColumnMode),
                },
                {
                    title: `Date`,
                    key: 'date',
                    render: makeRenderer(procedureDate, renderColumnMode),
                    width: 120,
                },
            ],
        },
        RelatedPerson: {
            title: 'Related Persons',
            icon: <UsergroupAddOutlined />,
            columns: [
                {
                    title: `Name`,
                    key: 'name',
                    render: makeRenderer(rpName, renderColumnMode),
                },
                {
                    title: `Relationship`,
                    key: 'relationship',
                    render: makeRenderer(rpRelationShip, renderColumnMode),
                    width: 120,
                },
            ],
        },
        MedicationRequest: {
            title: 'Medication Requests',
            icon: <ExceptionOutlined />,
            columns: [
                {
                    title: 'Name',
                    key: 'name',
                    render: makeRenderer(mrName, renderColumnMode),
                },
                {
                    title: 'Reason',
                    key: 'reason',
                    render: makeRenderer(mrReason, renderColumnMode),
                },
                {
                    title: 'Dosage',
                    key: 'date',
                    render: makeRenderer(mrDosage, renderColumnMode),
                    width: 200,
                },
                {
                    title: 'Status',
                    key: 'status',
                    render: makeRenderer(mrStatus, renderColumnMode),
                },
            ],
        },
    };

    return mapResourceConfigs[key] as any;
}

function prepareResource<T extends Resource>(
    resources: T[],
    bundle: Bundle<T>,
    key: AvailableResourceTypesStr,
): OverviewCard<T> {
    const { title, columns, icon } = getResourceConfigData(key, 'dashboard');

    return {
        title: title,
        key: key,
        icon: icon,
        data: resources,
        total: bundle.total ?? 0,
        getKey: (r) => r.id!,
        columns: columns,
    };
}

export const prepareAllergies = (
    r: AllergyIntolerance[],
    bundle: Bundle<AllergyIntolerance>,
): OverviewCard<AllergyIntolerance> => prepareResource<AllergyIntolerance>(r, bundle, 'AllergyIntolerance');
export const prepareConditions = (r: Condition[], bundle: Bundle<Condition>): OverviewCard<Condition> =>
    prepareResource(r, bundle, 'Condition');
export const prepareObservations = (r: Observation[], bundle: Bundle<Observation>): OverviewCard<Observation> =>
    prepareResource(r, bundle, 'Observation');
export const prepareImmunizations = (r: Immunization[], bundle: Bundle<Immunization>): OverviewCard<Immunization> =>
    prepareResource(r, bundle, 'Immunization');
export const prepareMedicationStatements = (
    r: MedicationStatement[],
    bundle: Bundle<MedicationStatement>,
): OverviewCard<MedicationStatement> => prepareResource(r, bundle, 'MedicationStatement');
export const prepareProcedures = (r: Procedure[], bundle: Bundle<Procedure>): OverviewCard<Procedure> =>
    prepareResource(r, bundle, 'Procedure');
export const prepareRelatedPersons = (r: RelatedPerson[], bundle: Bundle<RelatedPerson>): OverviewCard<RelatedPerson> =>
    prepareResource(r, bundle, 'RelatedPerson');
export const prepareMedicationRequests = (
    r: MedicationRequest[],
    bundle: Bundle<MedicationRequest>,
): OverviewCard<MedicationRequest> => prepareResource(r, bundle, 'MedicationRequest');
