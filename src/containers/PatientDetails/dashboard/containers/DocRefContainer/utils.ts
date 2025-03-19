import { Bundle, CompositionSection, BundleEntry, Reference, FhirResource } from 'fhir/r4b';

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

function getSectionRelatedResources(entries: BundleEntry[], sectionRelatedResourceRefs: Reference[]) {
    const relatedResources: FhirResource[] = [];
    for (const relatedResourceRef of sectionRelatedResourceRefs) {
        const resourceId = getResourceId(relatedResourceRef);
        if (resourceId === undefined) {
            continue;
        }

        const relatedEntry = entries.find((entry) => entry.resource?.id === resourceId);
        if (relatedEntry === undefined) {
            continue;
        }
        relatedResources.push(relatedEntry.resource!);
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
