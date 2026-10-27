import { ParametersParameter } from 'fhir/r4b';

import { getResourceClinicalContext } from '@beda.software/emr/utils';

import { selectCurrentUserRoleResource } from './role';

// Mirrors the contrib EMR's getAuthenticatedClinicalContextDefault, but resolves the
// user resource through this app's role matcher, which knows all Nawi roles
// (triage-nurse, clinician, ...) instead of only the four upstream roles.
export function getAuthenticatedClinicalContext(): ParametersParameter[] {
    const resource = selectCurrentUserRoleResource();

    return [
        ...getResourceClinicalContext('User', resource),
        ...getResourceClinicalContext(resource.resourceType, resource),
        ...getResourceClinicalContext('Author', resource),
    ];
}
