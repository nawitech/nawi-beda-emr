import { t } from '@lingui/macro';

import { OpdQueue } from 'src/containers/OpdQueue';

/**
 * Triage nurse queue: patients who have arrived and been opened as a visit by reception.
 *
 * Submitting the triage form completes the Task behind each row and enqueues the consultation,
 * so a patient leaves this queue only because their state actually moved.
 */
export function TriageQueue() {
    return (
        <OpdQueue
            stations={[{ taskCode: 'triage', questionnaireId: 'opd-triage', actionTitle: t`Record triage` }]}
            headerTitle={t`Triage queue`}
            emptyReportTitle={t`Waiting for triage`}
        />
    );
}
