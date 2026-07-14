import { ActivityAggregate } from './service';

export interface ReportSnapshot {
    title: string;
    period: string;
    totalVisits: number | string;
    aggregate: ActivityAggregate | null;
}

function csvCell(value: string | number): string {
    const text = String(value);

    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(snapshot: ReportSnapshot): string {
    const rows: Array<Array<string | number>> = [
        [snapshot.title],
        ['Period', snapshot.period],
        ['Total visits completed by clinical staff', snapshot.totalVisits],
        ['Unique patients seen by clinical staff', snapshot.aggregate?.uniquePatients ?? 'n/a'],
        [],
        ['Clinician', 'Unique patients', 'Visits'],
    ];

    Object.entries(snapshot.aggregate?.byPractitioner ?? {}).forEach(([who, stats]) => {
        rows.push([who.replace('Practitioner/', ''), stats.patients, stats.visits]);
    });

    if (snapshot.aggregate?.truncated) {
        rows.push([]);
        rows.push([
            `Note: breakdown computed from the first ${snapshot.aggregate.scanned} of ${snapshot.aggregate.total} matching encounters.`,
        ]);
    }

    return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Opens the user's own mail client with the report summary pre-filled, so a recipient
 * without an account can be sent the report as a file under the user's own identity.
 *
 * Only the summary goes in the body: most mail handlers truncate a mailto: URL past
 * roughly 2000 characters, so the per-clinician breakdown belongs in the CSV.
 */
export function buildMailtoUrl(snapshot: ReportSnapshot): string {
    const lines = [
        snapshot.title,
        `Period: ${snapshot.period}`,
        '',
        `Unique patients seen by clinical staff: ${snapshot.aggregate?.uniquePatients ?? 'n/a'}`,
        `Total visits completed by clinical staff: ${snapshot.totalVisits}`,
        '',
        'The per-clinician breakdown is in the attached CSV.',
    ];

    const subject = encodeURIComponent(`${snapshot.title} — ${snapshot.period}`);
    const body = encodeURIComponent(lines.join('\n'));

    return `mailto:?subject=${subject}&body=${body}`;
}
