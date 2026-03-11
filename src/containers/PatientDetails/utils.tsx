import {
    AlertOutlined,
    CheckOutlined,
    ExceptionOutlined,
    ExperimentOutlined,
    HeartOutlined,
    MedicineBoxOutlined,
    SnippetsOutlined,
    SubnodeOutlined,
    UsergroupAddOutlined,
} from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Button, notification } from 'antd';
import {
    AllergyIntolerance,
    Bundle,
    Composition,
    Condition,
    Immunization,
    MedicationRequest,
    MedicationStatement,
    Observation,
    Patient,
    Procedure,
    RelatedPerson,
    Resource,
} from 'fhir/r4b';
import { v4 as uuid4 } from 'uuid';

import type { OverviewCard } from '@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/components/StandardCard/types';
import { formatHumanDateTime } from '@beda.software/emr/utils';
import { extractBundleResources } from '@beda.software/fhir-react';

import {
    allergyDate,
    allergyName,
    conditionDate,
    conditionName,
    immunizationDate,
    immunizationVaccine,
    makeRenderer,
    mrDosage,
    mrName,
    mrReason,
    mrStatus,
    msDate,
    msDosage,
    msMedication,
    observationDate,
    observationName,
    observationValue,
    procedureDate,
    procedureTitle,
    rpName,
    rpRelationShip,
} from './resourceDataGetters';
import { AvailableResourceTypesStr, DashboardRT, MapResourceConfigType, UberListRT } from './types';



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

export function prepareIPSBundle(
    composition: Composition,
    relatedResourcesBundle: Bundle<
        Composition | Patient | Condition | AllergyIntolerance | MedicationStatement | Immunization | Procedure
    >,
): Bundle {
    const resources = extractBundleResources(relatedResourcesBundle);
    const patient = resources.Patient[0]!;
    const initialBundle: Bundle = {
        resourceType: 'Bundle',
        type: 'document',
        meta: {
            profile: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips'],
        },
        identifier: {
            system: 'http://hl7.org/fhir/uv/ips/ImplementationGuide/hl7.fhir.uv.ips',
            value: uuid4(),
        },
        timestamp: new Date().toISOString(),
        entry: [
            {
                fullUrl: `urn:uuid:${composition.id}`,
                resource: assign_urn_uuid_to_references(composition),
            },
            {
                fullUrl: `urn:uuid:${patient.id}`,
                resource: assign_urn_uuid_to_references(patient),
            },
        ],
    };

    const conditions = resources.Condition ?? [];
    const allergies = resources.AllergyIntolerance ?? [];
    const medicationStatements = resources.MedicationStatement ?? [];
    const immunizations = resources.Immunization ?? [];
    const procedures = resources.Procedure ?? [];
    const resultBundle: Bundle = {
        ...initialBundle,
        entry: [
            ...(initialBundle.entry ?? []),
            ...conditions.map((condition) => ({
                fullUrl: `urn:uuid:Condition/${condition.id}`,
                resource: assign_urn_uuid_to_references(condition),
            })),
            ...allergies.map((allergy) => ({
                fullUrl: `urn:uuid:AllergyIntolerance/${allergy.id}`,
                resource: assign_urn_uuid_to_references(allergy),
            })),
            ...medicationStatements.map((medicationStatement) => ({
                fullUrl: `urn:uuid:MedicationStatement/${medicationStatement.id}`,
                resource: assign_urn_uuid_to_references(medicationStatement),
            })),
            ...immunizations.map((immunization) => ({
                fullUrl: `urn:uuid:Immunization/${immunization.id}`,
                resource: assign_urn_uuid_to_references(immunization),
            })),
            ...procedures.map((procedure) => ({
                fullUrl: `urn:uuid:Procedure/${procedure.id}`,
                resource: assign_urn_uuid_to_references(procedure),
            })),
        ],
    };

    return resultBundle;
}

export function prepareComposition(
    resources: Composition[],
    bundle: Bundle<
        Composition | Patient | Condition | AllergyIntolerance | MedicationStatement | Immunization | Procedure
    >,
): OverviewCard<Composition> {
    return {
        title: 'Composition',
        key: 'composition',
        icon: <SnippetsOutlined />,
        data: resources,
        total: bundle.total ?? 0,
        getKey: (r) => r.id!,
        columns: [
            {
                title: 'Title',
                key: 'title',
                render: (resource) => {
                    return resource.title;
                },
            },
            {
                title: t`Date`,
                key: 'date',
                render: (resource) => formatHumanDateTime(resource.date),
            },
            {
                title: '',
                key: 'share',
                render: (resource) => {
                    const ipsBundle = prepareIPSBundle(resource, bundle);
                    return (
                        <Button
                            type="link"
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(ipsBundle, null, 2));
                                notification.success({
                                    message: t`IPS Bundle is copied to clipboard`,
                                });
                            }}
                        >{t`Share`}</Button>
                    );
                },
            },
        ],
    };
}

export function assign_urn_uuid_to_references(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => assign_urn_uuid_to_references(item));
    }
    if (typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'reference' && typeof value === 'string') {
                result[key] = value.startsWith('urn:uuid:') ? value : `urn:uuid:${value}`;
            } else {
                result[key] = assign_urn_uuid_to_references(value);
            }
        }
        return result;
    }
    return obj;
}
