import { Resource } from "fhir/r4b";
import { useParams } from 'react-router-dom';

import { ResourceListPageContent } from '@beda.software/emr/dist/uberComponents/ResourceListPageContent/index';

import { AvailableResourceTypesStr } from '../types';
import { getResourceConfigData } from '../utils';


export function ResourceList() {
    const params = useParams();
    const resourceType = params?.resourceType as AvailableResourceTypesStr
    const patientId = params?.id || ''
    const { columns } = getResourceConfigData(resourceType, 'uberList')

    return (
        <ResourceListPageContent<Resource>
            resourceType={resourceType}
            searchParams={{'patient': patientId}}
            getTableColumns={() => columns}
        />
    );
};
