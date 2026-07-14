import { chromium } from 'playwright';

const SHOT = '/tmp/claude-1000/-home-nerdstone-Personal-Projects-NawiTech-nawi-beda-emr/8b895010-ac9b-41f1-a90b-010f80d9a0fb/scratchpad';
const USER = process.argv[2] ?? 'clinician';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 160)));
const failed = [];
page.on('response', async (r) => {
    if (r.status() >= 400) {
        let body = '';
        try { body = (await r.text()).slice(0, 300); } catch { /* body already consumed */ }
        failed.push(`${r.status()} ${r.url().slice(0, 90)}\n      ${body}`);
    }
});
page.on('request', (r) => {
    if (r.url().includes('/token')) {
        console.log('TOKEN REQ postData:', (r.postData() ?? '').slice(0, 300));
    }
});

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /log in/i }).click();

await page.waitForURL(/realms\/beda-emr/, { timeout: 20000 });
await page.fill('#username', USER);
await page.fill('#password', 'password');
await page.click('#kc-login, input[type=submit]');

await page.waitForURL(/localhost:3000/, { timeout: 30000 });
await page.waitForLoadState('networkidle');
console.log('after login ->', page.url());
await page.screenshot({ path: `${SHOT}/02-${USER}-landing.png`, fullPage: true });

const body = await page.locator('body').innerText();
console.log('landing:', body.replace(/\n+/g, ' | ').slice(0, 300));

const row = page.locator('tr', { hasText: 'Denise Carroll' }).first();
if (await row.count()) {
    await row.getByRole('link', { name: /open/i }).or(row.getByText(/^Open$/)).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('chart ->', page.url());
    await page.screenshot({ path: `${SHOT}/03-${USER}-denise-chart.png`, fullPage: true });

    const chart = await page.locator('body').innerText();
    console.log('HIE badges  :', (chart.match(/CRISP HIE/g) || []).length);
    console.log('cards       :', ['Encounters', 'Conditions', 'Observations', 'Referrals', 'Consents', 'Medication Requests', 'Immunizations', 'Procedures']
        .filter((c) => chart.includes(c)).join(', '));
    console.log('actions     :', ['Document visit', 'Prescribe', 'Administer vaccine', 'Refer to specialist', 'Capture consent']
        .filter((c) => chart.includes(c)).join(', '));
    console.log('Harbor View :', chart.includes('Harbor View'));
} else {
    console.log('!! Denise not found');
}

await browser.close();
console.log('failed reqs :', failed.length ? failed.slice(0, 8) : 'none');
console.log('js errors   :', errors.length ? errors.slice(0, 5) : 'none');
