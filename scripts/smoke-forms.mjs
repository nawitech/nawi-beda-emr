import { chromium } from 'playwright';
const SHOT = process.env.SHOT_DIR;
const b = await chromium.launch();
const page = await b.newContext({ viewport: { width: 1500, height: 1000 } }).then(c => c.newPage());
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,120)));
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /log in/i }).click();
await page.waitForURL(/realms/); await page.fill('#username','clinician'); await page.fill('#password','password');
await page.click('#kc-login, input[type=submit]');
await page.waitForURL(/localhost:3000/); await page.waitForLoadState('networkidle');
await page.goto('http://localhost:3000/patients/pt-denise-carroll', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

for (const label of ['Document visit','Prescribe','Administer vaccine','Refer to specialist','Capture consent']) {
    await page.getByText(label, { exact: true }).first().click();
    await page.waitForTimeout(2500);
    const modal = page.locator('.ant-modal');
    const text = await modal.innerText().catch(() => '');
    const broken = /not know how to handle|Invalid request|not-supported|error/i.test(text);
    const fields = await modal.locator('input, textarea, .ant-select').count();
    console.log(`  ${label.padEnd(20)} modal=${await modal.count()>0} fields=${fields} ${broken ? 'ERROR: '+text.slice(0,80) : 'OK'}`);
    await page.screenshot({ path: `${SHOT}/30-form-${label.replace(/\W+/g,'-')}.png` });
    await modal.getByRole('button', { name: /cancel/i }).first().click().catch(()=>{});
    await page.waitForTimeout(800);
}
await b.close();
console.log('js errors:', errs.length ? errs.slice(0,3) : 'none');
