import { t } from '@lingui/macro';

import { OpdQueue } from 'src/containers/OpdQueue';

/**
 * Cashier queue: visits whose clinical work is done and which now need an invoice.
 *
 * Billing closes the visit — it is the only station that moves the Encounter to `finished`.
 */
export function BillingQueue() {
    return (
        <OpdQueue
            stations={[{ taskCode: 'billing', questionnaireId: 'opd-billing', actionTitle: t`Take payment` }]}
            headerTitle={t`Billing queue`}
            emptyReportTitle={t`Waiting for payment`}
        />
    );
}
