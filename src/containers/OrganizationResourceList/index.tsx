import { t, Trans } from '@lingui/macro';
import { Organization } from 'fhir/r4b';
import _ from 'lodash';

import { ResourceListPage } from '@beda.software/emr/uberComponents';

export function OrganizationResourceList() {
    return (
        <ResourceListPage<Organization>
            headerTitle={t`Organizations`}
            resourceType="Organization"
            getTableColumns={() => [
                {
                    title: <Trans>Name</Trans>,
                    dataIndex: 'name',
                    key: 'name',
                    render: (_text, { resource }) => resource.name,
                    width: 300,
                },
                {
                    title: <Trans>Active</Trans>,
                    dataIndex: 'active',
                    key: 'active',
                    render: (_text, { resource }) => (resource.active ? 'Yes' : 'No'),
                    width: 50,
                },
                {
                    title: <Trans>Contacts</Trans>,
                    dataIndex: 'contacts',
                    key: 'contacts',
                    render: (_text, { resource }) =>
                        resource.telecom?.map((contact) => (
                            <div key={contact.id}>{`${contact.system}: ${contact.value}`}</div>
                        )),
                    width: 250,
                },
                {
                    title: <Trans>Addresses</Trans>,
                    dataIndex: 'addresses',
                    key: 'addresses',
                    render: (_text, { resource }) =>
                        resource.address?.map((address) => (
                            <div
                                key={address.id}
                            >{`${address.type ? _.upperFirst(address.type) + ': ' : ''}${(address.line || []).join(', ')}, ${address.city}, ${address.state} ${address.postalCode}`}</div>
                        )),
                    width: 250,
                },
            ]}
        ></ResourceListPage>
    );
}
