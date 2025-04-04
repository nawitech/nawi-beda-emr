import { Resource } from "fhir/r4b";
import { useParams } from 'react-router-dom';

import { ResourceListPage } from '@beda.software/emr/dist/uberComponents/ResourceListPage/index';

import { AvailableResourceTypesStr } from '../types';
import { getResourceConfigData } from '../utils';


export function ResourceList() {
    const params = useParams();
    const resourceType = params?.resourceType as AvailableResourceTypesStr
    const patientId = params?.id || ''
    const { title, columns } = getResourceConfigData(resourceType, 'uberList')

    return (
        <ResourceListPage<Resource>
            resourceType={resourceType}
            headerTitle={title}
            searchParams={{'patient': patientId}}
            getTableColumns={() => columns}
        />
    );
};
