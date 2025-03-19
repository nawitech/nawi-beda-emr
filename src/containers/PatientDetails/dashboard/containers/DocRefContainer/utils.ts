import { Bundle, CompositionSection, BundleEntry, Reference, FhirResource } from 'fhir/r4b';

import { formatHumanDate, formatHumanDateTime } from '@beda.software/emr/utils';
import { extractBundleResources } from '@beda.software/fhir-react';

function getResourceId(fhirReference: Reference) {
    const reference = fhirReference.reference;
    if (reference === undefined) {
        return undefined;
    }

    if (reference.startsWith('urn:uuid')) {
        return reference.split(':').pop();
    }

    return reference.split('/').pop();
}

export interface ResourcFetchInfo {
    resourceType: string;
    resourceId: string;
    main?: string;
    additional?: string;
}

function getResourceMainInfo(resource: FhirResource): ResourcFetchInfo {
    if (resource.resourceType === 'Condition') {
        return {
            resourceType: resource.resourceType,
            resourceId: resource.id!,
            main: resource.code?.text ?? 'No info',
        };
    }
    if (resource.resourceType === 'AllergyIntolerance') {
        return {
            resourceType: resource.resourceType,
            resourceId: resource.id!,
            main: resource.code?.text ?? 'No info',
        };
    }

    if (resource.resourceType === 'Immunization') {
        return {
            resourceType: resource.resourceType,
            resourceId: resource.id!,
            main: resource.vaccineCode?.text ?? 'No info',
            additional: resource.occurrenceDateTime
                ? `Date: ${formatHumanDate(resource.occurrenceDateTime)}`
                : undefined,
        };
    }

    if (resource.resourceType === 'MedicationStatement') {
        return {
            resourceType: resource.resourceType,
            resourceId: resource.id!,
            main: resource.medicationCodeableConcept?.text ?? 'No info',
            additional: resource.dosage ? `Dosage: ${resource.dosage[0].text}` : undefined,
        };
    }

    if (resource.resourceType === 'MedicationRequest') {
        return {
            resourceType: resource.resourceType,
            resourceId: resource.id!,
            main: resource.medicationCodeableConcept?.text ?? 'No info',
            additional: resource.dosageInstruction ? `Dosage: ${resource.dosageInstruction[0].text}` : undefined,
        };
    }

    if (resource.resourceType === 'Observation') {
        return {
            resourceType: resource.resourceType,
            resourceId: resource.id!,
            main:
                `Observation: ${resource.code?.coding?.[0].display ?? 'No info'}. ` +
                `Value: ${resource.valueQuantity ? resource.valueQuantity.value + ' ' + resource.valueQuantity.unit : ''}`,
            additional: resource.effectiveDateTime
                ? `Date: ${formatHumanDateTime(resource.effectiveDateTime)}`
                : undefined,
        };
    }

    return { resourceId: resource.id!, resourceType: resource.resourceType };
}

function getSectionRelatedResources(entries: BundleEntry[], sectionRelatedResourceRefs: Reference[]) {
    const relatedResources: ResourcFetchInfo[] = [];
    for (const relatedResourceRef of sectionRelatedResourceRefs) {
        const resourceId = getResourceId(relatedResourceRef);
        if (resourceId === undefined) {
            continue;
        }

        const relatedEntry = entries.find((entry) => entry.resource?.id === resourceId);
        if (relatedEntry === undefined) {
            continue;
        }
        relatedResources.push(getResourceMainInfo(relatedEntry.resource!));
    }

    return relatedResources;
}

export function parsePatientSummary(bundle: Bundle) {
    const resourcesMap = extractBundleResources(bundle);
    const composition = resourcesMap.Composition[0];
    const sections = composition.section ?? [];

    const resourceEntries = (bundle.entry ?? []).slice(1);

    return sections.map((section) => {
        return {
            title: section.title,
            text: parseSectionText(section),
            relatedResources: getSectionRelatedResources(resourceEntries, section.entry ?? []),
        };
    });
}

export function parseSectionText(section: CompositionSection) {
    const narative = section.text;
    if (!narative) {
        return undefined;
    }

    let parsedString: string = narative.div;

    if (parsedString.startsWith('<div')) {
        parsedString = parsedString.match(/>([^<>]+)</)?.[1].trim() ?? 'There is no information available';
    }

    return parsedString;
}
