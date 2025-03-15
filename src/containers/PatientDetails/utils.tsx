import { OverviewCard } from "@beda.software/emr/dist/containers/PatientDetails/PatientOverviewDynamic/components/StandardCard/types";
import { AllergyIntolerance, Bundle, Condition, Extension, Observation, ObservationComponent } from "fhir/r4b";
import { AlertOutlined, ExperimentOutlined, HeartOutlined } from '@ant-design/icons';
import { extractExtension } from 'sdc-qrf';
import { formatHumanDate } from "@beda.software/emr/dist/utils/index";


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

function getComponentValue(c: ObservationComponent) {
    if (c.dataAbsentReason) {
        return [c.dataAbsentReason.text];
    }
    return [`${c.valueQuantity?.value} ${c.valueQuantity?.unit}`];
}

function getAbsentReason(extension?: Array<Extension>) {
    return extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/data-absent-reason');
}
