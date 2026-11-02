import { t } from '@lingui/macro';

import { OpdQueue } from 'src/containers/OpdQueue';

/**
 * Pharmacist queue: visits with prescriptions waiting to be dispensed.
 *
 * Dispensing records a MedicationDispense per prescription, marks the MedicationRequests
 * completed, and completes the pharmacy work item.
 */
export function PharmacyQueue() {
    return (
        <OpdQueue
            stations={[{ taskCode: 'pharmacy', questionnaireId: 'opd-dispense', actionTitle: t`Dispense` }]}
            headerTitle={t`Pharmacy queue`}
            emptyReportTitle={t`Waiting for pharmacy`}
        />
    );
}
