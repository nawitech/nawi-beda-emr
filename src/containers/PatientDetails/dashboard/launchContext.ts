import { ParametersParameter, Practitioner } from 'fhir/r4b';

import { sharedAuthorizedPractitioner } from '@beda.software/emr/sharedState';
import { WithId } from '@beda.software/fhir-react';

export function currentPractitioner(): WithId<Practitioner> | null {
    try {
        return sharedAuthorizedPractitioner.getSharedState() ?? null;
    } catch {
        return null;
    }
}

export function getAuthorLaunchContext(): Array<ParametersParameter> {
    const practitioner = currentPractitioner();

    if (!practitioner) {
        return [];
    }

    return [{ name: 'Author', resource: practitioner }];
}
