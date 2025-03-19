import { t } from '@lingui/macro';
import { Patient, ServiceRequest } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPageContent } from '@beda.software/emr/dist/uberComponents/ResourceListPageContent/index';
import { compileAsFirst } from '@beda.software/emr/dist/utils/index';

import { renderIdentifier } from 'src/utils';

const getCategory = compileAsFirst<ServiceRequest,string>(`
    ServiceRequest.category.select(text | coding.display).join(',')
`);


const getBusinessStatus = compileAsFirst<ServiceRequest, string>(`
     %Bundle.entry.resource.where(resourceType='Task').where(focus.reference = 'ServiceRequest/'+ %ServiceRequest.id).status
`);
const getStatus = compileAsFirst<ServiceRequest, string>(`
     %Bundle.entry.resource.where(resourceType='Task').where(focus.reference = 'ServiceRequest/'+ %ServiceRequest.id).businessStatus.coding.code
`);



export function PatientServiceRequest({ patient }: { patient: Patient }) {
    return (
        <ResourceListPageContent<ServiceRequest>
            resourceType="ServiceRequest"
            searchParams={{
                patient: patient.id!,
                _revinclude: "Task:focus",
            }}
            getTableColumns={() => [
                {
                    title: 'Identifier',
                    key: 'identifier',
                    render: (_text: any, { resource }) => (
                        <ul>{resource.identifier?.map((identitifier) => (
                            <li key={identitifier.value}>{renderIdentifier(identitifier)}</li>))}
                        </ul>
                    )
                },
                {
                    title: 'Category',
                    key: 'category',
                    render: (_text: any, { resource }) => getCategory(resource) ?? 'N/A',
                },
                {
                    title: 'Service',
                    key: 'service',
                    render: (_text: any, { resource }) => resource.code?.text ?? 'N/A',
                },
                {
                    title: 'Status',
                    key: 'status',
                    render: (_text: any, { resource, bundle }) => (<>
                        {getBusinessStatus(resource, { ServiceRequest: resource, Bundle: bundle })?.toString() ?? 'N/A'}
                        " - "
                        {getStatus(resource, { ServiceRequest: resource, Bundle: bundle })?.toString() ?? 'N/A'}
                    </>
                    )
                }
            ]}
            getFilters={() => [
                {
                    id: 'name',
                    searchParam: '_ilike',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`Find service request`,
                    placement: ['search-bar', 'table'],
                },
            ]}
            getReportColumns={(bundle) => [
                {
                    title: t`Number of Service Requests`,
                    value: bundle.total,
                },
            ]}
        />
    );
}
