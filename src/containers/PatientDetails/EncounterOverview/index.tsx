import { ContactsOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Encounter } from 'fhir/r4b';

import { DashboardCard } from '@beda.software/emr/components';
import { formatPeriodDateTime } from '@beda.software/emr/utils';

import { S } from './EncounterOverview.styles';

export function EncounterOverview({ encounter }: { encounter: Encounter }) {
    const encounterDetails: Array<{ title: string; value: string | null }> = [
        { title: 'Service Type', value: encounter.serviceType?.coding?.[0].display ?? null },
        { title: 'Status', value: encounter.status },
        { title: 'Period', value: formatPeriodDateTime(encounter.period) },
        { title: 'Reason', value: encounter.reasonCode?.[0].coding?.[0].display ?? null },
    ];

    return (
        <S.Container>
            <DashboardCard title={t`General Information`} icon={<ContactsOutlined />}>
                <S.DetailsRow>
                    {encounterDetails.map((item, index) => {
                        return (
                            <S.DetailItem key={`encounter-details__${index}`}>
                                <S.DetailsTitle>{item.title}</S.DetailsTitle>
                                <div>{item.value ?? '-'}</div>
                            </S.DetailItem>
                        );
                    })}
                    <S.DetailItem></S.DetailItem>
                </S.DetailsRow>
            </DashboardCard>
        </S.Container>
    );
}
