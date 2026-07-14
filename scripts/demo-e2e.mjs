/**
 * Drives all four RFI workflows end to end in a real browser, asserting the outcome of
 * each against the FHIR server, and recording a video per workflow.
 *
 *   node scripts/demo-e2e.mjs                 # all four
 *   node scripts/demo-e2e.mjs 1 3             # selected
 *
 * Run ./scripts/reset-demo-data.sh first: workflow 1 documents a visit and workflow 4
 * corrects a master record, so a second run against a dirty store will not reproduce
 * the same numbers.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const APP = 'http://localhost:3000';
const HAPI = 'http://localhost:8082/fhir';
const OUT = process.env.OUT_DIR ?? join(homedir(), 'Downloads', 'RFI_EHR');

/** The RFI asks for one video per workflow, named for its focus area and the vendor. */
const VIDEO_NAME = {
    1: 'Workflow1_PatientEncounter_Nawi.webm',
    2: 'Workflow2_MedicationAdministration_Nawi.webm',
    3: 'Workflow3_Administrator_Nawi.webm',
    4: 'Workflow4_Billing_Nawi.webm',
};
const PACE = Number(process.env.PACE ?? 1600);
const MP4 = process.env.MP4 !== '0';

function ffmpegPath() {
    if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;

    try {
        return execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim() || null;
    } catch {
        // no system ffmpeg
    }

    const vendored = join('.tools', 'ffenv', 'lib');
    if (existsSync(vendored)) {
        for (const py of readdirSync(vendored)) {
            const dir = join(vendored, py, 'site-packages', 'imageio_ffmpeg', 'binaries');
            if (!existsSync(dir)) continue;
            const bin = readdirSync(dir).find((f) => f.startsWith('ffmpeg-linux'));
            if (bin) return join(dir, bin);
        }
    }

    return null;
}

function toMp4(webm) {
    const ffmpeg = ffmpegPath();
    if (!ffmpeg) {
        console.log('   (ffmpeg unavailable — keeping webm)');
        return webm;
    }
    const mp4 = webm.replace(/\.webm$/, '.mp4');
    execFileSync(ffmpeg, [
        '-y', '-i', webm,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-movflags', '+faststart',
        mp4,
    ], { stdio: 'ignore' });
    rmSync(webm, { force: true });
    return mp4;
}

mkdirSync(OUT, { recursive: true });

const results = [];
const check = (workflow, step, ok, detail = '') => {
    results.push({ workflow, step, ok, detail });
    console.log(`   ${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`);
};

async function fhir(path, attempt = 0) {
    try {
        const response = await fetch(`${HAPI}${path}`, { headers: { connection: 'close' } });
        return await response.json();
    } catch (error) {
        if (attempt >= 3) throw error;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        return fhir(path, attempt + 1);
    }
}

async function countVisits() {
    const bundle = await fhir(
        '/Encounter?status=finished&participant:missing=false&date=ge2026-06-15&date=le2026-07-14&_total=accurate&_count=1',
    );
    return bundle.total;
}

async function session(name, user, run) {
    const browser = await chromium.launch({ slowMo: PACE / 6 });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        recordVideo: { dir: OUT, size: { width: 1600, height: 1000 } },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

    await page.goto(APP, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/realms\/beda-emr/, { timeout: 20000 });
    await page.fill('#username', user);
    await page.fill('#password', 'password');
    await page.click('#kc-login, input[type=submit]');
    await page.waitForURL(new RegExp('localhost:3000'), { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(PACE);

    try {
        await run(page);
    } finally {
        check(name, 'no javascript errors', errors.length === 0, errors[0] ?? '');
        await page.waitForTimeout(PACE * 2);

        const video = page.video();
        await context.close();
        await browser.close();

        if (video && VIDEO_NAME[name]) {
            const target = join(OUT, VIDEO_NAME[name]);
            renameSync(await video.path(), target);
            const final = MP4 ? toMp4(target) : target;
            console.log(`   video → ${final}`);
        }
    }
}

/** Waits for text to actually render, rather than assuming a fixed delay is enough. */
const waitForText = async (page, text, timeout = 20000) => {
    try {
        await page.waitForFunction((needle) => document.body.innerText.includes(needle), text, { timeout });
        return true;
    } catch {
        return false;
    }
};

const scrollTour = async (page, steps = 5) => {
    for (let i = 0; i < steps; i += 1) {
        await page.mouse.wheel(0, 420);
        await page.waitForTimeout(PACE * 0.7);
    }
    await page.mouse.wheel(0, -420 * steps);
    await page.waitForTimeout(PACE);
};

const hoverEach = async (page, locator, max = 4) => {
    const n = Math.min(await locator.count(), max);
    for (let i = 0; i < n; i += 1) {
        await locator.nth(i).hover().catch(() => {});
        await page.waitForTimeout(PACE);
    }
};

const modalOf = (page) => page.locator('.ant-modal');
const fillField = async (page, label, value) => {
    const group = modalOf(page).locator('.ant-form-item', { hasText: label }).first();
    await group.locator('input, textarea').first().fill(String(value));
    await page.waitForTimeout(120);
};
/**
 * Choice fields render as react-select, date fields as antd pickers, and the two need
 * different handling. react-select has no stable option class, so type-then-Enter is
 * the reliable path.
 */
const pickOption = async (page, label, option) => {
    const group = modalOf(page).locator('.ant-form-item', { hasText: label }).first();
    const antd = group.locator('.ant-select').first();

    if (await antd.count()) {
        await antd.click();
        await page.waitForTimeout(400);
        await page.locator('.ant-select-item-option', { hasText: option }).first().click();
        await page.waitForTimeout(200);
        return;
    }

    await group.locator('div[class*="Select__Container"]').first().click();
    await page.waitForTimeout(300);
    await page.keyboard.type(option, { delay: 30 });
    await page.waitForTimeout(700);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
};

const pickDate = async (page, label, value) => {
    const group = modalOf(page).locator('.ant-form-item', { hasText: label }).first();
    const input = group.locator('.ant-picker input, input').first();
    await input.click();
    await input.fill(value);
    await page.keyboard.press('Enter');
    // Blur to dismiss the picker panel, which is an overlay and would otherwise
    // swallow the click on the modal's Submit button. Escape would close the dialog.
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
};
const submitModal = async (page) => {
    const submit = modalOf(page).getByRole('button', { name: /submit/i });

    // Enter inside a date picker submits the surrounding form, so the dialog may have
    // closed and saved already. A missing Submit button means exactly that.
    if (!(await submit.count())) {
        await page.waitForTimeout(PACE);
        return;
    }

    await submit.scrollIntoViewIfNeeded().catch(() => {});
    await submit.click();
    await page.waitForTimeout(PACE * 3);
};

// ─────────────────────────────────────────────── 1. Patient encounter
async function workflow1() {
    console.log('\n WORKFLOW 1 — Patient Encounter (clinician)');
    const before = await countVisits();

    await session('1', 'clinician', async (page) => {
        // b. look up an existing patient
        await page.getByPlaceholder(/search/i).first().fill('Carroll').catch(() => {});
        await page.waitForTimeout(PACE);
        const body = await page.locator('body').innerText();
        check('1', 'b. patient found by name', body.includes('Denise Carroll'));

        await page.locator('tr', { hasText: 'Denise Carroll' }).first().getByText(/^Open$/).first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(PACE * 2);

        // c. history including outside-provider records via the HIE
        const chart = await page.locator('body').innerText();
        const badges = (chart.match(/CRISP HIE/g) || []).length;
        check('1', 'c. outside-provider records badged from the HIE', badges === 5, `${badges} badged resources`);
        check('1', 'c. Harbor View encounter present', chart.includes('Harbor View'));

        await hoverEach(page, page.getByText('CRISP HIE'), 5);
        await scrollTour(page, 6);

        // d. document the encounter
        await page.getByText('Document visit', { exact: true }).first().click();
        await page.waitForTimeout(PACE * 2);
        await fillField(page, 'Reason for visit', 'Worsening right foot ulcer; diabetes follow-up');
        await fillField(page, 'Systolic BP', 158);
        await fillField(page, 'Diastolic BP', 94);
        await fillField(page, 'Heart rate', 98);
        await fillField(page, 'Temperature', 38.1);
        await fillField(page, 'Weight', 92);
        await fillField(page, 'Point-of-care glucose', 396);
        await submitModal(page);
        check('1', 'd. encounter documented', !(await modalOf(page).isVisible().catch(() => false)));

        // e. prescribe
        await page.getByText('Prescribe', { exact: true }).first().click();
        await page.waitForTimeout(PACE * 2);
        await pickOption(page, 'Medication', 'Metformin hydrochloride 1000');
        await fillField(page, 'Dosage instructions', '1000 mg by mouth twice daily');
        await submitModal(page);

        // e. vaccine
        await page.getByText('Administer vaccine', { exact: true }).first().click();
        await page.waitForTimeout(PACE * 2);
        await pickOption(page, 'Vaccine', 'Pneumococcal');
        await submitModal(page);

        // f. referral
        await page.getByText('Refer to specialist', { exact: true }).first().click();
        await page.waitForTimeout(PACE * 2);
        await pickOption(page, 'Refer to', 'Igwe');
        await pickOption(page, 'Specialty', 'Endocrinology');
        await pickOption(page, 'Priority', 'Urgent');
        await fillField(page, 'Reason for referral', 'Uncontrolled type 2 diabetes, HbA1c 9.4%');
        await submitModal(page);

        // g. consent to share the record with the referred clinician
        await page.getByText('Capture consent', { exact: true }).first().click();
        await page.waitForTimeout(PACE * 2);
        await pickOption(page, 'Share record with', 'Igwe');
        await pickOption(page, 'Decision', 'Permit');
        await pickDate(page, 'Valid from', '14 Jul 2026');
        await pickDate(page, 'Valid until', '14 Jul 2027');
        await submitModal(page);

        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(PACE * 2);
    });

    // h. everything the clinician did is on the server
    const [encounters, meds, imms, refs, consents] = await Promise.all([
        fhir('/Encounter?subject=Patient/pt-denise-carroll&date=ge2026-07-14&_total=accurate&_count=1'),
        fhir('/MedicationRequest?subject=Patient/pt-denise-carroll&status=active&_total=accurate&_count=1'),
        fhir('/Immunization?patient=Patient/pt-denise-carroll&_total=accurate&_count=1'),
        fhir('/ServiceRequest?subject=Patient/pt-denise-carroll&_total=accurate&_count=1'),
        fhir('/Consent?patient=Patient/pt-denise-carroll&_total=accurate&_count=1'),
    ]);
    check('1', 'e. MedicationRequest on the server', meds.total >= 1);
    check('1', 'e. Immunization on the server', imms.total >= 1);
    check('1', 'f. ServiceRequest (referral) on the server', refs.total >= 1);
    check('1', 'g. Consent on the server', consents.total >= 1);
    void encounters;

    const after = await countVisits();
    check('1', 'the visit reaches the administrator report', after === before + 1, `${before} → ${after} visits`);
}

// ─────────────────────────────────────────────── 2. Medication administration
async function workflow2() {
    console.log('\n WORKFLOW 2 — Medication Administration (nurse) · step e not built');
    await session('2', 'triage-nurse', async (page) => {
        const landed = await waitForText(page, 'Medications due');
        await page.waitForTimeout(PACE * 2);
        const text = await page.locator('body').innerText();
        check('2', 'b. nurse lands on the medications worklist', landed);
        check('2', 'c. medication orders visible', text.includes('Ceftriaxone'));
        check('2', 'd.i  order received by pharmacy', text.includes('Order received by pharmacy'));
        check('2', 'd.ii filled by pharmacy', text.includes('Filled by pharmacy'));
        check('2', 'd.iii delivered and available', text.includes('Delivered — available for administration'));

        await hoverEach(page, page.locator('.ant-badge-status-text'), 3);
        await page.waitForTimeout(PACE * 2);
    });
}

// ─────────────────────────────────────────────── 3. Administrator
async function workflow3() {
    console.log('\n WORKFLOW 3 — Administrator');
    const expected = await countVisits();

    await session('3', 'administrator', async (page) => {
        check('3', 'a. administrator lands on reports', await waitForText(page, 'Ad Hoc Report Builder'));
        await page.waitForTimeout(PACE);

        // b. an existing report, its period fixed by the definition
        await page.getByText('Clinic Activity — Current Month').first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(PACE * 3);
        const canned = await page.locator('body').innerText();
        check('3', 'b. standard report runs', canned.includes('Total visits completed by clinical staff'));
        check('3', 'b. standard report exposes no parameters', !canned.includes('Visits from'));
        await scrollTour(page, 4);

        // c. the ad hoc report, its period chosen at run time
        await page.goto(`${APP}/reports/ad-hoc`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(PACE * 3);
        const tiles = async () => {
            const t = await page.locator('body').innerText();
            return {
                visits: t.match(/Total visits completed by clinical staff\s*\n?\s*(\d+|—)/)?.[1],
                patients: t.match(/Unique patients seen by clinical staff\s*\n?\s*(\d+|—)/)?.[1],
            };
        };
        const wide = await tiles();
        check('3', 'c. ad hoc report matches the server', wide.visits === String(expected),
            `${wide.visits} visits / ${wide.patients} unique patients`);

        const dates = page.locator('input[placeholder="Visits from"], input[placeholder="Visits to"]');
        await dates.nth(0).click();
        await dates.nth(0).fill('2026-07-01');
        await page.keyboard.press('Enter');
        await dates.nth(1).fill('2026-07-05');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(PACE * 4);

        const narrow = await tiles();
        const truth = await fhir('/Encounter?status=finished&participant:missing=false&date=ge2026-07-01&date=le2026-07-05&_total=accurate&_count=1');
        check('3', 'c. numbers move with the period', narrow.visits === String(truth.total),
            `${wide.visits}/${wide.patients} → ${narrow.visits}/${narrow.patients} (server says ${truth.total})`);

        const breakdown = await waitForText(page, 'By clinician', 8000);
        check('3', 'c. per-clinician breakdown shown', breakdown);
        await scrollTour(page, 5);

        // d. leaves the system as a file, for someone with no account
        const download = page.waitForEvent('download', { timeout: 15000 });
        await page.getByRole('button', { name: /CSV/ }).first().click();
        const file = await download;
        await file.saveAs(`${OUT}/clinical-staff-productivity.csv`);
        check('3', 'd. report exported as a file', true, `${OUT}/clinical-staff-productivity.csv`);
        await page.waitForTimeout(PACE);
    });
}

// ─────────────────────────────────────────────── 4. Billing
async function workflow4() {
    console.log('\n WORKFLOW 4 — Billing');
    const before = await fhir('/Claim?_has:ClaimResponse:request:outcome=error&_has:ClaimResponse:request:status=active&_total=accurate&_count=1');
    const patientBefore = await fhir('/Patient/pt-denise-carroll');

    await session('4', 'cashier', async (page) => {
        check('4', 'a. billing dashboard with workqueues', await waitForText(page, 'Clearinghouse rejections'));
        await page.waitForTimeout(PACE);

        await page.getByText('Clearinghouse rejections').first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(PACE * 3);

        const queue = await page.locator('body').innerText();
        check('4', 'b. front-end rejections listed', /A7/.test(queue), `${before.total} rejections`);
        check('4', 'c. our record and the payer record side by side',
            queue.includes(patientBefore.birthDate) && queue.includes('1967-03-04'));

        await scrollTour(page, 3);

        // c. the biller opens the chart straight from the claim
        await page.locator('tr', { hasText: 'Denise Carroll' }).first()
            .getByText('Open patient record').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(PACE * 2);
        check('4', 'c. patient chart opens from inside the claim',
            await waitForText(page, 'Denise Carroll'));
        await scrollTour(page, 3);
        await page.goBack({ waitUntil: 'networkidle' });
        await page.waitForTimeout(PACE * 2);

        const row = page.locator('tr', { hasText: 'Denise Carroll' }).first();
        await row.getByText('Correct and resubmit').click();
        await page.waitForTimeout(PACE * 2);

        const modal = modalOf(page);
        const dob = modal.locator('.ant-picker input').first();
        await dob.click();
        await dob.fill('04 Mar 1967');
        await page.keyboard.press('Enter');
        await modal.locator('input.ant-input, textarea.ant-input').first()
            .fill('Corrected per payer eligibility record');
        await page.waitForTimeout(PACE);
        await submitModal(page);
        await page.waitForTimeout(PACE * 2);

        const after = await page.locator('body').innerText();
        check('4', 'd. rejection leaves the queue', !after.includes('Denise Carroll'));
    });

    const patientAfter = await fhir('/Patient/pt-denise-carroll');
    const queueAfter = await fhir('/Claim?_has:ClaimResponse:request:outcome=error&_has:ClaimResponse:request:status=active&_total=accurate&_count=1');
    const provenance = await fhir('/Provenance?target=Patient/pt-denise-carroll&_total=accurate&_count=1');

    check('4', 'd. master file corrected', patientAfter.birthDate === '1967-03-04',
        `${patientBefore.birthDate} → ${patientAfter.birthDate}`);
    check('4', 'd. correction is versioned', Number(patientAfter.meta.versionId) > Number(patientBefore.meta.versionId),
        `v${patientBefore.meta.versionId} → v${patientAfter.meta.versionId}`);
    check('4', 'd. the rest of the record survived', Boolean(patientAfter.name?.[0]?.family && patientAfter.address?.length));
    check('4', 'd. change is attributable', provenance.total >= 1, `${provenance.total} Provenance record`);
    check('4', 'd. workqueue drops', queueAfter.total === before.total - 1, `${before.total} → ${queueAfter.total}`);
}

// ───────────────────────────────────────────────
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2', '3', '4'];
const all = { 1: workflow1, 2: workflow2, 3: workflow3, 4: workflow4 };

for (const w of wanted) {
    await all[w]();
}

console.log('\n─────────────────────────────────────────────');
const failed = results.filter((r) => !r.ok);
for (const w of wanted) {
    const rows = results.filter((r) => r.workflow === w);
    const bad = rows.filter((r) => !r.ok).length;
    console.log(` workflow ${w}: ${rows.length - bad}/${rows.length} checks passed`);
}
console.log(`\n ${results.length - failed.length}/${results.length} total`);
if (failed.length) {
    console.log('\n FAILED:');
    failed.forEach((f) => console.log(`   workflow ${f.workflow}: ${f.step} ${f.detail}`));
}
console.log(`\n recordings + CSV in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
