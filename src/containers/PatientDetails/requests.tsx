import { t } from '@lingui/macro';
import { Patient, ServiceRequest } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPageContent } from '@beda.software/emr/dist/uberComponents/ResourceListPageContent/index';
import { compileAsFirst } from '@beda.software/emr/dist/utils/index';

import { renderIdentifier } from 'src/utils';

const getCategory = compileAsFirst<ServiceRequest,string>(`
    ServiceRequest.category.select(text | coding.display).join(',')
`);


const getStatus = compileAsFirst<ServiceRequest, string>(`
     %Bundle.entry.resource.where(resourceType='Task').where(focus.reference = 'ServiceRequest/'+ %ServiceRequest.id).status
`);
const getBusinessStatus = compileAsFirst<ServiceRequest, string>(`
     %Bundle.entry.resource.where(resourceType='Task').where(focus.reference = 'ServiceRequest/'+ %ServiceRequest.id).businessStatus.coding.code
`);
const getError = compileAsFirst<ServiceRequest, string>(`
     %Bundle.entry.resource.where(resourceType='Task').where(focus.reference = 'ServiceRequest/'+ %ServiceRequest.id).statusReason.text
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
                    render: (_text: any, { resource, bundle }) => {
                        const context = { ServiceRequest: resource, Bundle: bundle };
                        const status = getStatus(resource, context)?.toString() ?? 'N/A';
                        const businessStatus = getBusinessStatus(resource, context)?.toString() ?? 'N/A';
                        const error = getError(resource, context)?.toString() ?? 'N/A';
                        return (
                            <>
                                { businessStatus }
                                {" - "}
                                { status }
                                {status === 'rejected' ? <><br/>{error}</> : null}
                            </>
                        );
                    }
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
