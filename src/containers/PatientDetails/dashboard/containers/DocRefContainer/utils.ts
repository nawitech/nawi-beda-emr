import { Bundle, CompositionSection } from 'fhir/r4b';

import { extractBundleResources } from '@beda.software/fhir-react';

export function parsePatientSummary(bundle: Bundle) {
    const resourcesMap = extractBundleResources(bundle);
    const composition = resourcesMap.Composition[0];
    const sections = composition.section ?? [];

    return sections.map((section) => {
        return { title: section.title, text: parseSectionText(section), entries: section.entry ?? [] };
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
