import { ColumnType } from 'antd/lib/table';
import {
    AllergyIntolerance,
    Condition,
    Extension,
    Immunization,
    MedicationStatement,
    Observation,
    ObservationComponent,
    Procedure,
    RelatedPerson,
    MedicationRequest,
    Resource,
    Bundle
} from 'fhir/r4b';
import { extractCreatedAtFromMeta } from 'sdc-qrf';

import {
    formatHumanDate,
    formatHumanDateTime,
    formatPeriodDateTime,
    renderHumanName,
} from '@beda.software/emr/dist/utils/index';


type RecordType<R extends Resource> = { resource: R; bundle: Bundle };


export function makeRenderer<T extends Resource, RCM extends 'uberList' | 'dashboard'>(
    fn: (r: T) => React.ReactNode,
    renderColumnMode: RCM,
): typeof renderColumnMode extends 'uberList' ? ColumnType<RecordType<T>>['render'] : (resource: T) => React.ReactNode {
    return (renderColumnMode === 'uberList' ? (_text: any, { resource }: { resource: T }) => fn(resource) : (resource: T) => fn(resource)) as any; // @ts-ignore
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

export const isUberList = (renderType: 'uberList' | 'dashboard') => renderType == 'uberList';
export const allergyName = (r: AllergyIntolerance): string => r.code?.text ?? r.code?.coding?.[0]?.display ?? 'Unknown';
export const allergyDate = (r: AllergyIntolerance): string => {
    const createdAt = extractCreatedAtFromMeta(r.meta);
    const date = r.recordedDate || createdAt || r.meta?.lastUpdated;

    return date ? formatHumanDate(date) : 'Unknown';
};
export const conditionName = (r: Condition): string =>
    r.code?.text ?? r.code?.coding?.[0]?.display ?? r.code?.coding?.[0]?.code ?? 'unknown';
export const conditionDate = (r: Condition): string => {
    const date = r.recordedDate || r.onsetDateTime;
    return date ? formatHumanDate(date) : 'Unknown';
};
export const observationName = (r: Observation): string => r.code.text ?? r.code.coding?.[0]?.display ?? 'Unknown';
export const observationDate = (r: Observation): string => {
    const createdAt = extractCreatedAtFromMeta(r.meta);
    const date = r.effectiveDateTime || r.issued || createdAt;
    if (date) {
        return formatHumanDate(date);
    }

    const masked = getAbsentReason(r._effectiveDateTime?.extension);
    return masked?.valueCode ?? 'Unknown';
};
export const observationValue = (r: Observation): string | React.ReactElement => {
    if (r.dataAbsentReason) {
        return r.dataAbsentReason.text ?? r.dataAbsentReason.coding?.[0]?.display ?? 'unknown';
    } else if (r.valueQuantity) {
        const masked = getAbsentReason(r.valueQuantity.extension);
        if (masked) {
            return masked.valueCode ?? 'Unknown';
        }
        return `${r.valueQuantity.value} ${r.valueQuantity.unit}`;
    } else if (r.valueCodeableConcept) {
        return r.valueCodeableConcept.text ?? r.valueCodeableConcept.coding?.[0]?.display ?? 'Unknown';
    } else if (r.component) {
        return (
            <>
                {r.component
                    .map((c) => [...[c.code.coding?.[0]?.display], ...getComponentValue(c)].join(': '))
                    .map((v) => (
                        <div key={v}>{v}</div>
                    ))}
            </>
        );
    }
    return 'Unknown';
};
export const immunizationVaccine = (r: Immunization) => r.vaccineCode.text ?? 'Unknown';
export const immunizationDate = (r: Immunization) =>
    r.occurrenceDateTime ? formatHumanDate(r.occurrenceDateTime) : 'Unknown';
export const msMedication = (r: MedicationStatement) =>
    r.medicationCodeableConcept?.text ?? r.medicationCodeableConcept?.coding?.[0].display ?? 'Unknown';
export const msDosage = (r: MedicationStatement) => {
    const dosageItem = r.dosage?.find((item) => item.text !== undefined);

    return dosageItem?.text ?? 'Unknown';
};
export const msDate = (r: MedicationStatement) => (r.dateAsserted ? formatHumanDate(r.dateAsserted) : 'Unknown');
export const procedureTitle = (r: Procedure) => r.code?.coding?.[0].display ?? r.code?.text ?? 'Unknown';
export const procedureDate = (r: Procedure) => {
    if (r.performedPeriod) {
        return formatPeriodDateTime(r.performedPeriod) ?? 'Unknown';
    } else if (r.performedDateTime) {
        return formatHumanDateTime(r.performedDateTime) ?? 'Unknown';
    } else {
        return 'Unknown';
    }
};
export const rpName = (r: RelatedPerson) => renderHumanName(r.name?.[0]);
export const rpRelationShip = (r: RelatedPerson) => r.relationship?.[0].coding?.[0].display ?? 'Unknown';
export const mrName = (r: MedicationRequest) =>
    r.medicationCodeableConcept?.coding?.[0]?.display ?? r.medicationCodeableConcept?.text ?? 'Unknown';
export const mrReason = (r: MedicationRequest) => r.reasonCode?.[0]?.coding?.[0]?.display ?? 'Unknown';
export const mrDosage = (r: MedicationRequest) =>
    r.dosageInstruction?.[0]?.text ? r.dosageInstruction?.[0]?.text : '';
export const mrStatus = (r: MedicationRequest) => r.status;
