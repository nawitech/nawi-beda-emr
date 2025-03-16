import { t } from '@lingui/macro';
import { Patient, ServiceRequest } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPageContent } from '@beda.software/emr/dist/uberComponents/ResourceListPageContent/index';
import { compileAsFirst } from '@beda.software/emr/dist/utils/index';

const getCategory = compileAsFirst<ServiceRequest,string>("ServiceRequest.category.coding.display.join(',')");
const getIdentifier = compileAsFirst<ServiceRequest,string>(`
    ServiceRequest.identifier.where(
        system='http://ns.electronichealth.net.au/id/hpio-scoped/order/1.0/8003629900040359').assigner.display + ' (' +
    ServiceRequest.identifier.where(
        system='http://ns.electronichealth.net.au/id/hpio-scoped/order/1.0/8003629900040359').value + ')'
`);

export function PatientServiceRequest({ patient }: { patient: Patient }) {
    return (
        <ResourceListPageContent<ServiceRequest>
            resourceType="ServiceRequest"
            searchParams={{
                patient: patient.id!,
            }}
            getTableColumns={() => [
                {
                    title: 'Identifier',
                    key: 'identifier',
                    render: (_text: any, { resource }) => getIdentifier(resource) ?? 'N/A',
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
