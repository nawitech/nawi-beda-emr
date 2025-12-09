import { t, Trans } from '@lingui/macro';
import { Location } from 'fhir/r4b';
import _ from 'lodash';

import { ResourceListPage } from '@beda.software/emr/uberComponents';

export function LocationResourceList() {
    return (
        <ResourceListPage<Location>
            headerTitle={t`Locations`}
            resourceType="Location"
            getTableColumns={() => [
                {
                    title: <Trans>Name</Trans>,
                    dataIndex: 'name',
                    key: 'name',
                    render: (_text, { resource }) => {
                        return resource.name;
                    },
                    width: 300,
                },
                {
                    title: <Trans>Type</Trans>,
                    dataIndex: 'type',
                    key: 'type',
                    render: (_text, { resource }) => {
                        return (resource.type || []).map((type) => type.text ?? type.coding?.[0]?.display).join(', ');
                    },
                    width: 100,
                },
                {
                    title: <Trans>Contacts</Trans>,
                    dataIndex: 'contacts',
                    key: 'contacts',
                    render: (_text, { resource }) =>
                        resource.telecom?.map((contact) => {
                            if (!contact.value) {
                                return null;
                            }

                            return <div key={contact.id}>{`${contact.system}: ${contact.value}`}</div>;
                        }),
                    width: 250,
                },
                {
                    title: <Trans>Address</Trans>,
                    dataIndex: 'address',
                    key: 'address',
                    render: (_text, { resource }) => {
                        const address = resource.address;
                        if (!address) {
                            return null;
                        }

                        return (
                            <div
                                key={address?.id}
                            >{`${address?.type ? _.upperFirst(address.type) + ': ' : ''}${(address?.line || []).join(', ')}, ${address?.city}, ${address?.state} ${address?.postalCode}`}</div>
                        );
                    },
                    width: 250,
                },
            ]}
        ></ResourceListPage>
    );
}
