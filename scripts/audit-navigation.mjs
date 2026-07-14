import { chromium } from 'playwright';

const APP = 'http://localhost:3000';
const SHOT = process.env.SHOT_DIR ?? '/tmp';

const ROLES = [
    'clinician',
    'triage-nurse',
    'pharmacist',
    'receptionist',
    'lab-technician',
    'cashier',
    'administrator',
    'patient',
];

const results = [];
const record = (role, screen, ok, detail = '') => {
    results.push({ role, screen, ok, detail });
    console.log(`   ${ok ? '✓' : '✗'} ${screen}${detail ? ` — ${detail}` : ''}`);
};

const isBlank = (text) => text.replace(/\s/g, '').length < 40;

for (const role of ROLES) {
    console.log(`\n ${role}`);
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
    const page = await context.newPage();

    const errors = [];
    const failed = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
    page.on('response', (r) => {
        if (r.status() >= 400 && !r.url().includes('favicon')) {
            failed.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 70)}`);
        }
    });

    try {
        await page.goto(APP, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /log in/i }).click();
        await page.waitForURL(/realms\/beda-emr/, { timeout: 20000 });
        await page.fill('#username', role);
        await page.fill('#password', 'password');
        await page.click('#kc-login, input[type=submit]');
        await page.waitForURL(new RegExp('localhost:3000'), { timeout: 30000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2500);

        // The sidebar is an antd Menu that navigates via onClick, not anchors.
        const menu = page.locator('aside .ant-menu-item');
        const items = [];
        for (let i = 0; i < (await menu.count()); i += 1) {
            const key = await menu.nth(i).getAttribute('data-menu-id');
            const label = (await menu.nth(i).innerText().catch(() => '')).trim();
            items.push({ index: i, label: label || key || `item ${i}`, key });
        }

        if (!items.length) {
            record(role, 'sidebar has items', false, 'no menu items found');
        }

        for (const item of items) {
            errors.length = 0;
            failed.length = 0;

            await page.locator('aside .ant-menu-item').nth(item.index).click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2800);

            const text = await page.locator('body').innerText();
            const blank = isBlank(text);
            const url = new URL(page.url()).pathname;
            const ok = !blank && errors.length === 0;

            record(
                role,
                `${item.label} → ${url}`,
                ok,
                blank ? 'BLANK PAGE' : errors.length ? errors[0] : failed.length ? `http ${failed[0]}` : '',
            );

            if (!ok) {
                await page.screenshot({
                    path: `${SHOT}/nav-fail-${role}-${item.label.replace(/\W+/g, '_')}.png`,
                    fullPage: true,
                });
            }
        }

        // Screens reached by clicking through, not from the sidebar.
        const DEEP = {
            administrator: ['/reports/clinic-activity', '/reports/ad-hoc'],
            cashier: ['/billing/rejections'],
        };

        for (const path of DEEP[role] ?? []) {
            errors.length = 0;
            failed.length = 0;

            await page.goto(APP + path, { waitUntil: 'networkidle' });
            await page.waitForTimeout(3200);

            const text = await page.locator('body').innerText();
            const blank = isBlank(text);
            record(
                role,
                `${path}`,
                !blank && errors.length === 0,
                blank ? 'BLANK PAGE' : errors.length ? errors[0] : failed.length ? `http ${failed[0]}` : '',
            );
            if (blank || errors.length) {
                await page.screenshot({
                    path: `${SHOT}/nav-fail-${role}-${path.replace(/\W+/g, '_')}.png`,
                    fullPage: true,
                });
            }
        }

        // Patient detail is reached from the list, not the sidebar.
        if (items.some((i) => /patient/i.test(i.label))) {
            errors.length = 0;
            failed.length = 0;
            await page.goto(`${APP}/patients`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(2500);

            const open = page.locator('tbody tr').first().getByText(/^Open$/).first();
            if (await open.count()) {
                await open.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3500);

                const text = await page.locator('body').innerText();
                const blank = isBlank(text);
                record(
                    role,
                    'patient detail (opened from list)',
                    !blank && errors.length === 0,
                    blank ? 'BLANK PAGE' : errors.length ? errors[0] : '',
                );
                if (blank || errors.length) {
                    await page.screenshot({ path: `${SHOT}/nav-fail-${role}-patient-detail.png`, fullPage: true });
                }
            } else {
                record(role, 'patient detail (opened from list)', false, 'no Open action on any row');
            }
        }
    } catch (e) {
        record(role, 'session', false, String(e).slice(0, 100));
    } finally {
        await context.close();
        await browser.close();
    }
}

console.log('\n─────────────────────────────────────────────');
const bad = results.filter((r) => !r.ok);
console.log(` ${results.length - bad.length}/${results.length} screens render`);
if (bad.length) {
    console.log('\n BROKEN:');
    bad.forEach((b) => console.log(`   ${b.role.padEnd(14)} ${b.screen}  ${b.detail}`));
}
process.exit(bad.length ? 1 : 0);
