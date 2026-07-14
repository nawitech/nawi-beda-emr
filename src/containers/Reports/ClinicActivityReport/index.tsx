import { t } from '@lingui/macro';
import moment from 'moment';

import { ActivityReport } from '../ActivityReport';

export function ClinicActivityReport() {
    const from = moment().startOf('month');
    const to = moment();
    const period = `${from.format('D MMM YYYY')} — ${to.format('D MMM YYYY')}`;

    return (
        <ActivityReport
            title={t`Clinic Activity — Current Month`}
            period={period}
            searchParams={{
                date: [`ge${from.format('YYYY-MM-DD')}`, `le${to.format('YYYY-MM-DD')}`] as unknown as string,
            }}
        />
    );
}
