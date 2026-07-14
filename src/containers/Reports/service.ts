import { Bundle, Encounter } from 'fhir/r4b';

import { service } from '@beda.software/emr/services';
import { isSuccess } from '@beda.software/remote-data';

export const CLINICAL_ACTIVITY_SEARCH_PARAMS = {
    status: 'finished',
    'participant:missing': false,
    _total: 'accurate',
    _sort: '-date',
    _count: 10,
    _include: ['Encounter:subject', 'Encounter:participant'],
};

const AGGREGATE_LIMIT = 1000;

export interface ActivityAggregate {
    uniquePatients: number;
    byPractitioner: Record<string, { visits: number; patients: number }>;
    scanned: number;
    total: number;
    truncated: boolean;
}

export async function aggregateClinicalActivity(bundle: Bundle): Promise<ActivityAggregate | null> {
    const selfUrl = bundle.link?.find((link) => link.relation === 'self')?.url;

    if (!selfUrl) {
        return null;
    }

    const query = new URLSearchParams(selfUrl.split('?')[1] ?? '');

    ['_count', '_getpages', '_getpagesoffset', '_elements', '_sort', '_total'].forEach((p) => query.delete(p));

    const params: Record<string, string | string[] | number> = {};
    new Set(query.keys()).forEach((key) => {
        const values = query.getAll(key);
        params[key] = values.length > 1 ? values : values[0]!;
    });

    const response = await service<Bundle<Encounter>>({
        url: '/Encounter',
        params: {
            ...params,
            _elements: 'subject,participant,period',
            _count: AGGREGATE_LIMIT,
            _total: 'accurate',
        },
    });

    if (!isSuccess(response)) {
        return null;
    }

    const encounters = (response.data.entry ?? [])
        .map((entry) => entry.resource)
        .filter((resource): resource is Encounter => resource?.resourceType === 'Encounter');

    const patients = new Set<string>();
    const byPractitioner: Record<string, { visits: number; patients: number }> = {};
    const practitionerPatients: Record<string, Set<string>> = {};

    encounters.forEach((encounter) => {
        const subject = encounter.subject?.reference;

        if (subject) {
            patients.add(subject);
        }

        (encounter.participant ?? []).forEach((participant) => {
            const who = participant.individual?.reference;

            if (!who) {
                return;
            }

            byPractitioner[who] ??= { visits: 0, patients: 0 };
            byPractitioner[who].visits += 1;

            practitionerPatients[who] ??= new Set<string>();

            if (subject) {
                practitionerPatients[who].add(subject);
            }
        });
    });

    Object.entries(practitionerPatients).forEach(([who, set]) => {
        byPractitioner[who]!.patients = set.size;
    });

    const total = response.data.total ?? encounters.length;

    return {
        uniquePatients: patients.size,
        byPractitioner,
        scanned: encounters.length,
        total,
        truncated: total > encounters.length,
    };
}
