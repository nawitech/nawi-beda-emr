import { t } from '@lingui/macro';

import { OpdQueue } from 'src/containers/OpdQueue';

/**
 * Lab technician queue: visits with outstanding laboratory orders.
 *
 * Submitting results records the specimen, the result observations and a DiagnosticReport,
 * closes the ordered ServiceRequests, and completes the lab work item.
 */
export function LabQueue() {
    return (
        <OpdQueue
            stations={[{ taskCode: 'lab', questionnaireId: 'opd-lab-results', actionTitle: t`Record results` }]}
            headerTitle={t`Laboratory queue`}
            emptyReportTitle={t`Waiting for laboratory`}
        />
    );
}
