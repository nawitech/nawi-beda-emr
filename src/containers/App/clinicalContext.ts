import { ParametersParameter } from 'fhir/r4b';

import { getResourceClinicalContext } from '@beda.software/emr/dist/utils/clinicalContext';

import { selectCurrentUserRoleResource } from 'src/utils/role';

export function getAuthenticatedClinicalContext(): ParametersParameter[] {
    const userRoleResource = selectCurrentUserRoleResource();

    return [
        ...getResourceClinicalContext('User', userRoleResource),
        ...getResourceClinicalContext(userRoleResource.resourceType, userRoleResource),
        ...getResourceClinicalContext('Author', userRoleResource),
    ];
}
