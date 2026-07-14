import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1600, height: 1100 } }).then((c) => c.newPage());

const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 100)}`); });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /log in/i }).click();
await page.waitForURL(/realms\/beda-emr/, { timeout: 20000 });
await page.fill('#username', 'administrator');
await page.fill('#password', 'password');
await page.click('#kc-login, input[type=submit]');
await page.waitForURL(/localhost:3000/, { timeout: 30000 });
await page.waitForLoadState('networkidle');

console.log('admin landing ->', page.url());
await page.screenshot({ path: `${SHOT}/10-admin-reports.png`, fullPage: true });
console.log('landing:', (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 200));

// 3.b — the canned report
await page.goto('http://localhost:3000/reports/ad-hoc', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${SHOT}/11-adhoc-default.png`, fullPage: true });
const before = await page.locator('body').innerText();
console.log('\n--- AD HOC (no filter yet)');
console.log(before.replace(/\n+/g, ' | ').slice(0, 320));

// Narrow the range to a window the server says holds exactly 7 encounters.
// If the tiles still read 48 the filter is not reaching the query.
const tiles = async () => {
    const text = await page.locator('body').innerText();
    const visits = text.match(/Total visits completed by clinical staff\s*\n?\s*(\d+|—)/)?.[1];
    const patients = text.match(/Unique patients seen by clinical staff\s*\n?\s*(\d+|—)/)?.[1];
    return { visits, patients };
};
console.log('tiles before filter:', await tiles());

const dateInputs = page.locator('input[placeholder="Visits from"], input[placeholder="Visits to"]');
console.log('date inputs found:', await dateInputs.count());
if (await dateInputs.count() >= 2) {
    await dateInputs.nth(0).click();
    await dateInputs.nth(0).fill('2026-07-01');
    await page.keyboard.press('Enter');
    await dateInputs.nth(1).fill('2026-07-05');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SHOT}/12-adhoc-filtered.png`, fullPage: true });

    const after = await tiles();
    console.log('tiles after  filter:', after, '  (server says 7 visits)');
    console.log(after.visits === '7' ? 'DATE FILTER WORKS' : '!! DATE FILTER NOT APPLIED');
}

await browser.close();
console.log('\nfailed reqs:', failed.length ? failed.slice(0, 6) : 'none');
console.log('js errors  :', errors.length ? errors.slice(0, 4) : 'none');
