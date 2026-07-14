import { chromium } from 'playwright';
const SHOT = process.env.SHOT_DIR ?? '/tmp';
const b = await chromium.launch();
const page = await b.newContext({ viewport: { width: 1500, height: 1100 } }).then(c => c.newPage());
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,140)));

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /log in/i }).click();
await page.waitForURL(/realms/); await page.fill('#username','clinician'); await page.fill('#password','password');
await page.click('#kc-login, input[type=submit]');
await page.waitForURL(/localhost:3000/); await page.waitForLoadState('networkidle');
await page.goto('http://localhost:3000/patients/pt-denise-carroll', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

await page.getByText('Document visit', { exact: true }).first().click();
await page.waitForTimeout(2500);
const modal = page.locator('.ant-modal');

const num = async (label, value) => {
    const f = modal.locator(`input[id*="${label}"], input`).nth(0);
    void f;
};

// Fill by label text -> the input that follows it.
const setByLabel = async (label, value) => {
    const group = modal.locator('.ant-form-item', { hasText: label }).first();
    const input = group.locator('input, textarea').first();
    await input.fill(String(value));
};

await setByLabel('Reason for visit', 'Worsening right foot ulcer');
await setByLabel('Systolic BP', 158);
await setByLabel('Diastolic BP', 94);
await setByLabel('Heart rate', 98);
await setByLabel('Temperature', 38.1);
await setByLabel('Weight', 92);
await setByLabel('Point-of-care glucose', 396);
await page.screenshot({ path: `${SHOT}/50-visit-note-filled.png`, fullPage: true });

await modal.getByRole('button', { name: /submit/i }).click();
await page.waitForTimeout(6000);
await page.screenshot({ path: `${SHOT}/51-after-visit-note.png`, fullPage: true });
const t = await page.locator('body').innerText();
console.log('  modal closed :', (await modal.count()) === 0 || !(await modal.isVisible().catch(()=>false)));
console.log('  chart shows Clinic visit:', t.includes('Clinic visit'));
await b.close();
console.log('  js errors:', errs.length ? errs.slice(0,3) : 'none');
