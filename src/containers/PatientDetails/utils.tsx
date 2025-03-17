import { AlertOutlined, CheckOutlined, ExperimentOutlined, HeartOutlined, MedicineBoxOutlined, SubnodeOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { AllergyIntolerance, Bundle, Condition, Extension, Immunization, MedicationStatement, Observation, ObservationComponent, Procedure, RelatedPerson } from "fhir/r4b";
import { extractExtension } from 'sdc-qrf';

import type { OverviewCard } from "@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/components/StandardCard/types";
import { formatHumanDate, formatHumanDateTime, formatPeriodDateTime, renderHumanName } from "@beda.software/emr/dist/utils/index";


export function prepareAllergies(
    allergies: AllergyIntolerance[],
    bundle: Bundle<AllergyIntolerance>,
): OverviewCard<AllergyIntolerance> {
    return {
        title: `Allergies`,
        key: 'Allergies',
        icon: <ExperimentOutlined />,
        data: allergies,
        total: bundle.total!,
        getKey: (r: AllergyIntolerance) => r.id!,
        columns: [
            {
                title: `Name`,
                key: 'name',
                render: (resource: AllergyIntolerance) =>
                    resource.code?.text ?? resource.code?.coding?.[0]?.display ?? 'unknown',
            },
            {
                title: `Date`,
                key: 'date',
                render: (r: AllergyIntolerance) => {
                    const createdAt = extractExtension(r.meta?.extension, 'ex:createdAt');
                    const date = r.recordedDate || createdAt || r.meta?.lastUpdated;

                    return date ? formatHumanDate(date) : null;
                },
                width: 120,
            },
        ],
    };

};

export function prepareConditions(
    conditions: Condition[],
    bundle: Bundle<Condition>,
): OverviewCard<Condition> {
    return {
        title: `Conditions`,
        key: 'Conditions',
        icon: <AlertOutlined />,
        data: conditions,
        total: bundle.total!,
        getKey: (r: Condition) => r.id!,
        columns: [
            {
                title: `Name`,
                key: 'name',
                render: (resource: Condition) =>
                    resource.code?.text ??
                    resource.code?.coding?.[0]?.display ??
                    resource.code?.coding?.[0]?.code ??
                    'unknown',
            },
            {
                title: `Date`,
                key: 'date',
                render: (r: Condition) => {
                    const date = r.recordedDate || r.onsetDateTime;
                    return date ? formatHumanDate(date) : null;
                },
                width: 120,
            },
        ],
    };
}

export function prepareObservations(
    observations: Observation[],
    bundle: Bundle<Observation>): OverviewCard<Observation> {
    return {
        title: `Observations`,
        key: 'Observations',
        icon: <HeartOutlined />,
        data: observations,
        total: bundle.total!,
        getKey: (r: Observation) => r.id!,
        columns: [
            {
                title: `Name`,
                key: 'name',
                render: (resource: Observation) => {
                    return resource.code.text ?? resource.code.coding?.[0]?.display ?? 'Unknown';
                },
                width: 200,
            },
            {
                title: `Date`,
                key: 'date',
                render: (r: Observation) => {
                    const createdAt = extractExtension(r.meta?.extension, 'ex:createdAt');
                    const date = r.effectiveDateTime || r.issued || createdAt;
                    if (date) {
                        return formatHumanDate(date);
                    }

                    const masked = getAbsentReason(r._effectiveDateTime?.extension);
                    return masked?.valueCode;
                },
            },
            {
                title: `Value`,
                key: 'value',
                render: (resource: Observation) => {
                    if (resource.dataAbsentReason) {
                        return (
                            resource.dataAbsentReason.text ??
                            resource.dataAbsentReason.coding?.[0]?.display ??
                            'unknown'
                        );
                    } else if (resource.valueQuantity) {
                        const masked = getAbsentReason(resource.valueQuantity.extension);
                        if (masked) {
                            return masked.valueCode;
                        }
                        return `${resource.valueQuantity.value} ${resource.valueQuantity.unit}`;
                    } else if (resource.valueCodeableConcept) {
                        return resource.valueCodeableConcept.text || resource.valueCodeableConcept.coding?.[0]?.display;
                    } else if (resource.component) {
                        return (
                            <>
                                {resource.component
                                    .map((c) => [...[c.code.coding?.[0]?.display], ...getComponentValue(c)].join(': '))
                                    .map((v) => (
                                        <div key={v}>{v}</div>
                                    ))}
                            </>
                        );
                    }
                    return null;
                },
            },
        ],
    };
}
export function prepareImmunizations(
    immunizations: Immunization[],
    bundle: Bundle<Immunization>): OverviewCard<Immunization> {
    return {
        title: `Immunizations`,
        key: 'Immunizations',
        icon: <MedicineBoxOutlined />,
        data: immunizations,
        total: bundle.total!,
        getKey: (r: Immunization) => r.id!,
        columns: [
            {
                title: `Vaccine`,
                key: 'vaccine',
                render: (resource: Immunization) => {
                    return resource.vaccineCode.text ?? 'Unknown';
                },
            },
            {
                title: `Date`,
                key: 'date',
                render: (r: Immunization) => {
                    return r.occurrenceDateTime ? formatHumanDate(r.occurrenceDateTime) : 'Unknown'
                },
                width: 120,
            },
        ],
    };
}

export function prepareMedicationStatements(
    medicationStatements: MedicationStatement[],
    bundle: Bundle<MedicationStatement>): OverviewCard<MedicationStatement> {
    return {
        title: `Medication Statements`,
        key: 'MedicationStatements',
        icon: <CheckOutlined />,
        data: medicationStatements,
        total: bundle.total!,
        getKey: (r: MedicationStatement) => r.id!,
        columns: [
            {
                title: `Medication`,
                key: 'medication',
                render: (resource: MedicationStatement) => {
                    return resource.medicationCodeableConcept?.coding?.[0].display ?? 'Unknown';
                },
            },
            {
                title: 'Dosage',
                key: 'dosage',
                render: (resource: MedicationStatement) => {
                    const dosageItem = resource.dosage?.find((item) => item.text !== undefined)

                    return dosageItem?.text ?? 'Unknown'
                }
            },
            {
                title: `Date`,
                key: 'date',
                render: (r: MedicationStatement) => {
                    return r.dateAsserted ? formatHumanDate(r.dateAsserted) : 'Unknown'
                },
                width: 120,
            },
        ],
    };
}

export function prepareProcedures(
    medicationStatements: Procedure[],
    bundle: Bundle<Procedure>): OverviewCard<Procedure> {
    return {
        title: `Procedures`,
        key: 'Procedures',
        icon: <SubnodeOutlined />,
        data: medicationStatements,
        total: bundle.total!,
        getKey: (r: Procedure) => r.id!,
        columns: [
            {
                title: `Title`,
                key: 'title',
                render: (resource: Procedure) => {
                    return resource.code?.coding?.[0].display ?? 'Unknown';
                },
            },
            {
                title: `Date`,
                key: 'date',
                render: (r: Procedure) => {
                    if (r.performedPeriod) {
                        return formatPeriodDateTime(r.performedPeriod)
                    } else if (r.performedDateTime) {
                        return formatHumanDateTime(r.performedDateTime)
                    } else {
                        return 'Unknown'
                    }
                },
                width: 120,
            },
        ],
    };
}

export function prepareRelatedPersons(
    medicationStatements: RelatedPerson[],
    bundle: Bundle<RelatedPerson>): OverviewCard<RelatedPerson> {
    return {
        title: `Related persons`,
        key: 'related-persons',
        icon: <UsergroupAddOutlined />,
        data: medicationStatements,
        total: bundle.total!,
        getKey: (r: RelatedPerson) => r.id!,
        columns: [
            {
                title: `Name`,
                key: 'name',
                render: (resource: RelatedPerson) => {
                    return renderHumanName(resource.name?.[0]);
                },
            },
            {
                title: `Relationship`,
                key: 'relationship',
                render: (r: RelatedPerson) => {
                    return r.relationship?.[0].coding?.[0].display ?? 'Unknown'
                },
                width: 120,
            },
        ],
    };
}

function getComponentValue(c: ObservationComponent) {
    if (c.dataAbsentReason) {
        return [c.dataAbsentReason.text];
    }
    return [`${c.valueQuantity?.value} ${c.valueQuantity?.unit}`];
}

function getAbsentReason(extension?: Array<Extension>) {
    return extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/data-absent-reason');
}
