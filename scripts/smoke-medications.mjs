import { chromium } from 'playwright';
const SHOT = process.env.SHOT_DIR ?? '/tmp';
const b = await chromium.launch();
const page = await b.newContext({ viewport: { width: 1700, height: 1000 } }).then(c => c.newPage());
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,140)));
const failed = []; page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0,90)}`); });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /log in/i }).click();
await page.waitForURL(/realms/); await page.fill('#username','triage-nurse'); await page.fill('#password','password');
await page.click('#kc-login, input[type=submit]');
await page.waitForURL(/localhost:3000/); await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000);
console.log('nurse landing ->', page.url());
await page.screenshot({ path: `${SHOT}/40-medications.png`, fullPage: true });

const t = await page.locator('body').innerText();
console.log('\n--- PHARMACY STATES ON ONE SCREEN');
console.log('  received  :', t.includes('Order received by pharmacy'));
console.log('  filled    :', t.includes('Filled by pharmacy'));
console.log('  delivered :', t.includes('Delivered — available for administration'));
console.log('  meds      :', ['Ceftriaxone','Insulin glargine','Metformin'].filter(m => t.includes(m)).join(', '));
console.log('  Denise    :', t.includes('Denise Carroll'));
await b.close();
console.log('\nfailed reqs:', failed.length ? failed.slice(0,5) : 'none');
console.log('js errors  :', errs.length ? errs.slice(0,3) : 'none');
