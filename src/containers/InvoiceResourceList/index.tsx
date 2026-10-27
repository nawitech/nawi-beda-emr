import { t, Trans } from '@lingui/macro';
import { Invoice, Patient } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage, navigationAction } from '@beda.software/emr/uberComponents';
import { formatHumanDate, renderHumanName, resolveReference } from '@beda.software/emr/utils';

/**
 * Nawi invoice list. Replaces Beda's `InvoiceList` for the reason documented in
 * src/containers/EncounterResourceList/index.tsx — the upstream container calls the upstream
 * role matcher, which does not know the Nawi roles.
 *
 * Upstream also offers `pay-invoice` and `cancel-invoice` questionnaire actions. Those seeds
 * are not loaded in this deployment, so they are deliberately absent rather than present and
 * broken; they arrive with the billing workflow.
 */
export function InvoiceResourceList() {
    return (
        <ResourceListPage<Invoice>
            headerTitle={t`Invoices`}
            resourceType="Invoice"
            searchParams={{
                '_include:iterate': ['Invoice:patient:Patient'],
                _sort: '-_lastUpdated,_id',
            }}
            getTableColumns={() => [
                {
                    title: <Trans>Patient</Trans>,
                    dataIndex: 'patient',
                    key: 'patient',
                    render: (_text, { resource, bundle }) => {
                        if (!resource.subject) {
                            return null;
                        }
                        const patient = resolveReference<Patient>(bundle, resource.subject);
                        return renderHumanName(patient?.name?.[0]) || resource.subject.display;
                    },
                    width: 260,
                },
                {
                    title: <Trans>Date</Trans>,
                    dataIndex: 'date',
                    key: 'date',
                    render: (_text, { resource }) => (resource.date ? formatHumanDate(resource.date) : null),
                    width: 160,
                },
                {
                    title: <Trans>Status</Trans>,
                    dataIndex: 'status',
                    key: 'status',
                    render: (_text, { resource }) => resource.status,
                    width: 140,
                },
                {
                    title: <Trans>Total</Trans>,
                    dataIndex: 'total',
                    key: 'total',
                    render: (_text, { resource }) => {
                        const total = resource.totalGross ?? resource.totalNet;
                        return total?.value === undefined ? null : `${total.value} ${total.currency ?? ''}`.trim();
                    },
                    width: 140,
                },
            ]}
            getFilters={() => [
                {
                    id: 'status',
                    searchParam: 'status',
                    type: SearchBarColumnType.CHOICE,
                    placeholder: t`Status`,
                    options: [
                        { value: { Coding: { code: 'draft', display: 'Draft' } } },
                        { value: { Coding: { code: 'issued', display: 'Issued' } } },
                        { value: { Coding: { code: 'balanced', display: 'Balanced' } } },
                        { value: { Coding: { code: 'cancelled', display: 'Cancelled' } } },
                    ],
                    placement: ['table', 'search-bar'],
                },
            ]}
            getRecordActions={({ resource }) => [navigationAction(t`Open`, `/invoices/${resource.id}`)]}
            getReportColumns={(bundle) => [{ title: t`Invoices`, value: bundle.total }]}
        />
    );
}
