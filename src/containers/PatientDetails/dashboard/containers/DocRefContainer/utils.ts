import { Composition, CompositionSection } from 'fhir/r4b';

export function parsePatientSummary(composition: Composition) {
    const sections = composition.section ?? [];

    return sections.map((section) => {
        return { title: section.title, text: parseSectionText(section) };
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
