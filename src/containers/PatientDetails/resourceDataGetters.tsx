import { Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/lib/table';
import {
    AllergyIntolerance,
    Condition,
    Consent,
    Encounter,
    Extension,
    Immunization,
    MedicationStatement,
    Observation,
    ObservationComponent,
    Procedure,
    RelatedPerson,
    MedicationRequest,
    Resource,
    ServiceRequest,
    Bundle,
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
    return (
        renderColumnMode === 'uberList'
            ? (_text: any, { resource }: { resource: T }) => fn(resource)
            : (resource: T) => fn(resource)
    ) as any; // @ts-ignore
}

const HIE_TAG_CODE = 'HIE';
const HIE_SOURCE_HINTS = ['crisp'];

export function isHIESourced(r: Resource): boolean {
    const source = r.meta?.source?.toLowerCase() ?? '';
    const taggedHIE = (r.meta?.tag ?? []).some((tag) => tag.code === HIE_TAG_CODE);

    return taggedHIE || HIE_SOURCE_HINTS.some((hint) => source.includes(hint));
}

function hieSourceLabel(r: Resource): string {
    const tag = (r.meta?.tag ?? []).find((t) => t.code === HIE_TAG_CODE);

    return tag?.display ?? r.meta?.source ?? 'Received via health information exchange';
}

export function withHIEBadge<T extends Resource>(fn: (r: T) => React.ReactNode): (r: T) => React.ReactNode {
    return (r: T) => {
        if (!isHIESourced(r)) {
            return <>{fn(r)}</>;
        }

        return (
            <>
                {fn(r)}
                <Tooltip title={hieSourceLabel(r)}>
                    <Tag color="geekblue" style={{ marginLeft: 8 }}>
                        CRISP HIE
                    </Tag>
                </Tooltip>
            </>
        );
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
export const observationName = (r: Observation): string =>
    r.code.text ?? r.code.coding?.[0]?.display ?? r.code.coding?.[0].code ?? 'Unknown';
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
        return (
            r.valueCodeableConcept.text ??
            r.valueCodeableConcept.coding?.[0]?.display ??
            r.valueCodeableConcept.coding?.[0]?.code ??
            'Unknown'
        );
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
export const immunizationVaccine = (r: Immunization) =>
    r.vaccineCode.text ?? r.vaccineCode.coding?.[0].display ?? r.vaccineCode.coding?.[0].code ?? 'Unknown';
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

export const encounterType = (r: Encounter) =>
    r.type?.[0]?.text ?? r.type?.[0]?.coding?.[0]?.display ?? r.class?.display ?? 'Encounter';
export const encounterDate = (r: Encounter) => (r.period?.start ? formatHumanDateTime(r.period.start) : 'Unknown');
export const encounterStatus = (r: Encounter) => r.status;
export const encounterProvider = (r: Encounter) =>
    r.serviceProvider?.display ?? r.serviceProvider?.reference?.split('/')[1] ?? 'Unknown';

export const srName = (r: ServiceRequest) => r.code?.text ?? r.code?.coding?.[0]?.display ?? 'Referral';
export const srPerformer = (r: ServiceRequest) =>
    r.performer?.[0]?.display ?? r.performer?.[0]?.reference?.split('/')[1] ?? 'Unassigned';
export const srPriority = (r: ServiceRequest) => r.priority ?? 'routine';
export const srDate = (r: ServiceRequest) => (r.authoredOn ? formatHumanDate(r.authoredOn) : 'Unknown');

export const consentRecipient = (r: Consent) => {
    const actor = r.provision?.actor?.[0]?.reference;

    return actor?.display ?? actor?.reference?.split('/')[1] ?? 'Unknown';
};
export const consentDecision = (r: Consent) => (r.provision?.type === 'permit' ? 'Permitted' : 'Denied');
export const consentPeriod = (r: Consent) =>
    r.provision?.period ? (formatPeriodDateTime(r.provision.period) ?? 'Unknown') : 'Unknown';
export const consentStatus = (r: Consent) => r.status;
