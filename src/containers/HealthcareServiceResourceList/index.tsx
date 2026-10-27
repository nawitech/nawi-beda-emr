import { t, Trans } from '@lingui/macro';
import { HealthcareService, Organization } from 'fhir/r4b';

import { SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';
import { ResourceListPage } from '@beda.software/emr/uberComponents';
import { resolveReference } from '@beda.software/emr/utils';

/**
 * Nawi healthcare service list. Replaces Beda's `HealthcareServiceList`, which calls the
 * upstream `selectCurrentUserRoleResource` and therefore crashes on Nawi roles — see
 * src/containers/EncounterResourceList/index.tsx.
 *
 * Read-only for now. The upstream create/edit questionnaires exist but are not seeded here.
 */
export function HealthcareServiceResourceList() {
    return (
        <ResourceListPage<HealthcareService>
            headerTitle={t`Healthcare services`}
            resourceType="HealthcareService"
            searchParams={{
                '_include:iterate': ['HealthcareService:organization'],
                _sort: 'name',
            }}
            getTableColumns={() => [
                {
                    title: <Trans>Name</Trans>,
                    dataIndex: 'name',
                    key: 'name',
                    render: (_text, { resource }) => resource.name,
                    width: 280,
                },
                {
                    title: <Trans>Category</Trans>,
                    dataIndex: 'category',
                    key: 'category',
                    render: (_text, { resource }) =>
                        resource.category?.[0]?.text ?? resource.category?.[0]?.coding?.[0]?.display,
                    width: 220,
                },
                {
                    title: <Trans>Organization</Trans>,
                    dataIndex: 'organization',
                    key: 'organization',
                    render: (_text, { resource, bundle }) => {
                        if (!resource.providedBy) {
                            return null;
                        }
                        const organization = resolveReference<Organization>(bundle, resource.providedBy);
                        return organization?.name ?? resource.providedBy.display;
                    },
                    width: 240,
                },
                {
                    title: <Trans>Active</Trans>,
                    dataIndex: 'active',
                    key: 'active',
                    render: (_text, { resource }) => (resource.active === false ? t`No` : t`Yes`),
                    width: 120,
                },
            ]}
            getFilters={() => [
                {
                    id: 'name',
                    searchParam: 'name',
                    type: SearchBarColumnType.STRING,
                    placeholder: t`Find service`,
                    placement: ['table', 'search-bar'],
                },
            ]}
            getReportColumns={(bundle) => [{ title: t`Healthcare services`, value: bundle.total }]}
        />
    );
}
