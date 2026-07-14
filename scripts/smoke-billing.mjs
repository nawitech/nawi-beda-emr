import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1700, height: 1100 } }).then((c) => c.newPage());

const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 100)}`); });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /log in/i }).click();
await page.waitForURL(/realms\/beda-emr/, { timeout: 20000 });
await page.fill('#username', 'cashier');
await page.fill('#password', 'password');
await page.click('#kc-login, input[type=submit]');
await page.waitForURL(/localhost:3000/, { timeout: 30000 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2500);

console.log('biller landing ->', page.url());
await page.screenshot({ path: `${SHOT}/20-billing-dashboard.png`, fullPage: true });
console.log('dashboard:', (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 260));

await page.goto('http://localhost:3000/billing/rejections', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SHOT}/21-rejections.png`, fullPage: true });

const text = await page.locator('body').innerText();
console.log('\n--- REJECTION WORKQUEUE');
console.log('  Denise present :', text.includes('Denise Carroll'));
console.log('  our record     :', text.includes('1967-03-14'));
console.log('  payer record   :', text.includes('1967-03-04'));
console.log('  A7 code        :', /A7/.test(text));
console.log('  actions        :', ['Open patient record', 'Correct and resubmit'].filter((a) => text.includes(a)).join(', '));
const count = text.match(/Rejections awaiting rework\s*\n?\s*(\d+)/)?.[1];
console.log('  queue count    :', count);

// Work the rejection: correct the master file and resubmit.
if (process.env.RUN_CORRECTION === '1') {
    const row = page.locator('tr', { hasText: 'Denise Carroll' }).first();
    await row.getByText('Correct and resubmit').click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOT}/22-correction-form.png`, fullPage: true });

    const form = await page.locator('body').innerText();
    console.log('\n--- CORRECTION FORM');
    console.log('  prefilled with our DOB:', form.includes('1967-03-14'));

    const modal = page.locator('.ant-modal');

    const dob = modal.locator('.ant-picker input').first();
    await dob.click();
    await dob.fill('04 Mar 1967');
    await page.keyboard.press('Enter');

    const reason = modal.locator('input.ant-input, textarea.ant-input').first();
    await reason.fill('Corrected per payer eligibility record');

    await modal.getByRole('button', { name: /submit/i }).click();
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${SHOT}/23-after-correction.png`, fullPage: true });

    const after = await page.locator('body').innerText();
    const count = after.match(/Rejections awaiting rework\s*\n?\s*(\d+)/)?.[1];
    console.log('  queue count after     :', count, '(was 3)');
    console.log('  Denise still queued   :', after.includes('Denise Carroll'));
}

await browser.close();
console.log('\nfailed reqs:', failed.length ? failed.slice(0, 6) : 'none');
console.log('js errors  :', errors.length ? errors.slice(0, 4) : 'none');
