import { t } from '@lingui/macro';

import { OpdQueue } from 'src/containers/OpdQueue';

/**
 * Clinician queue. Two kinds of work, one worklist:
 *
 *  - `consultation` — triage is done, the patient has not been seen yet.
 *  - `review`       — laboratory results are back and the clinician needs to look at them.
 *
 * They are the same person doing the same job at different points in the visit, so splitting
 * them into separate menu items would only make it easier to forget one. The Stage column
 * distinguishes them, and each row offers its own form.
 */
export function ConsultationQueue() {
    return (
        <OpdQueue
            stations={[
                { taskCode: 'consultation', questionnaireId: 'opd-consultation', actionTitle: t`Start consultation` },
                { taskCode: 'review', questionnaireId: 'opd-review', actionTitle: t`Review results` },
            ]}
            headerTitle={t`Clinician queue`}
            emptyReportTitle={t`Waiting for clinician`}
        />
    );
}
