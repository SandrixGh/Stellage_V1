import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    // Simulate dark mode OS preference just in case, but also set it manually
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    const logs = [];

    page.on('console', msg => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
        logs.push(`[error] ${err.message}`);
    });

    try {
        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
        
        // Force dark theme by setting data-theme attribute on html
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
            // If the app uses a store (like Zustand), it might override it, but let's try
            localStorage.setItem('theme', 'dark'); 
        });

        // Give it a moment to apply theme
        await page.waitForTimeout(1000);
        
        console.log('Taking screenshot of dark main page...');
        await page.screenshot({ path: 'screenshot_dark_main.png', fullPage: true });

        // Try clicking a filter "Golden"
        console.log('Clicking on Golden filter...');
        const goldenFilter = page.locator('text=Golden').first();
        if (await goldenFilter.isVisible()) {
            await goldenFilter.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshot_dark_filter_golden.png', fullPage: true });
        }

        // Try clicking on "Войти" (Login)
        console.log('Clicking on Войти (Login)...');
        const loginBtn = page.locator('button:has-text("Войти")').first();
        if (await loginBtn.isVisible()) {
            await loginBtn.click();
            await page.waitForTimeout(1500); // wait for modal/page transition
            await page.screenshot({ path: 'screenshot_dark_login.png', fullPage: true });
        }

        fs.writeFileSync('browser_logs_dark.txt', logs.join('\n'));
        console.log('Done! Screenshots saved.');
    } catch (e) {
        console.error('Error during testing:', e);
    } finally {
        await browser.close();
    }
})();
