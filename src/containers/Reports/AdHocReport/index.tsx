import { t } from '@lingui/macro';

import { SearchBarColumn, SearchBarColumnType } from '@beda.software/emr/dist/components/SearchBar/types';

import { ActivityReport } from '../ActivityReport';

export function AdHocReport() {
    const getFilters = (): SearchBarColumn[] => [
        {
            id: 'date',
            searchParam: 'date',
            type: SearchBarColumnType.DATE,
            placeholder: [t`Visits from`, t`Visits to`],
        },
        {
            id: 'participant',
            searchParam: 'participant',
            type: SearchBarColumnType.REFERENCE,
            placeholder: t`Filter by clinician`,
            expression: 'Practitioner',
            path: "name.given.first() + ' ' + name.family",
        },
    ];

    return (
        <ActivityReport
            title={t`Clinical Staff Productivity — Ad Hoc`}
            period={t`As selected`}
            filters={getFilters()}
        />
    );
}
