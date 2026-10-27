import { t, Trans } from '@lingui/macro';
import { ChargeItemDefinition } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage, questionnaireAction } from '@beda.software/emr/uberComponents';

import { hasRole, Role } from 'src/utils/role';

/**
 * The clinic's price list: one `ChargeItemDefinition` per billable code, across the lab
 * menu, the formulary and the service catalogue.
 *
 * The billing form (`opd-billing`) reads these on open and prices every invoice line from
 * them, so a change here is live for the next invoice — no seed rebuild, no restart. Seeds
 * under resources/fhir-seeds/ChargeItemDefinition/ are the starting tariff; this page is how
 * it is maintained afterwards. See docs/opd-billing-workflow.md.
 *
 * The cashier can look prices up here; only the administrator can change them. As with
 * every role check in this app, hiding the action is a usability measure, not authorization.
 */

const CATALOGUE_LABELS: Record<string, () => string> = {
    'https://emr.nawi.ke/fhir/CodeSystem/opd-lab-test': () => t`Laboratory test`,
    'https://emr.nawi.ke/fhir/CodeSystem/opd-medication': () => t`Medication`,
    'https://emr.nawi.ke/fhir/CodeSystem/opd-billable-service': () => t`Service`,
};

function basePrice(definition: ChargeItemDefinition) {
    return definition.propertyGroup
        ?.flatMap((group) => group.priceComponent ?? [])
        .find((component) => component.type === 'base')?.amount;
}

export function PriceListResourceList() {
    const canEdit = hasRole(Role.Administrator);

    return (
        <ResourceListPage<ChargeItemDefinition>
            headerTitle={t`Price list`}
            resourceType="ChargeItemDefinition"
            searchParams={{ _sort: 'title' }}
            getTableColumns={() => [
                {
                    title: <Trans>Item</Trans>,
                    dataIndex: 'title',
                    key: 'title',
                    render: (_text, { resource }) => resource.title ?? resource.code?.coding?.[0]?.display,
                    width: 320,
                },
                {
                    title: <Trans>Catalogue</Trans>,
                    dataIndex: 'catalogue',
                    key: 'catalogue',
                    render: (_text, { resource }) => {
                        const system = resource.code?.coding?.[0]?.system;
                        return system ? (CATALOGUE_LABELS[system]?.() ?? system) : null;
                    },
                    width: 180,
                },
                {
                    title: <Trans>Code</Trans>,
                    dataIndex: 'code',
                    key: 'code',
                    render: (_text, { resource }) => resource.code?.coding?.[0]?.code,
                    width: 220,
                },
                {
                    title: <Trans>Unit price</Trans>,
                    dataIndex: 'price',
                    key: 'price',
                    render: (_text, { resource }) => {
                        const amount = basePrice(resource);
                        return amount?.value === undefined ? null : `${amount.value} ${amount.currency ?? ''}`.trim();
                    },
                    width: 140,
                },
                {
                    title: <Trans>Status</Trans>,
                    dataIndex: 'status',
                    key: 'status',
                    render: (_text, { resource }) => resource.status,
                    width: 120,
                },
            ]}
            getFilters={() => [
                {
                    id: 'title',
                    searchParam: 'title',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`Find item`,
                    placement: ['table', 'search-bar'],
                },
                {
                    id: 'status',
                    searchParam: 'status',
                    type: SearchBarColumnType.CHOICE,
                    placeholder: t`Status`,
                    options: [
                        { value: { Coding: { code: 'active', display: 'Active' } } },
                        { value: { Coding: { code: 'retired', display: 'Retired' } } },
                    ],
                    placement: ['table', 'search-bar'],
                },
            ]}
            getRecordActions={() => (canEdit ? [questionnaireAction(t`Edit price`, 'opd-price-edit')] : [])}
            getReportColumns={(bundle) => [{ title: t`Priced items`, value: bundle.total }]}
        />
    );
}
