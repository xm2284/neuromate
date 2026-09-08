const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const phase = process.argv[2] || 'before';
const baseUrl = process.argv[3] || 'http://localhost:8321';
const outDir = path.join(__dirname, '..', 'test-results', `${phase}-v1.6`);

const pages = [
  { name: 'home', url: '/' },
  { name: 'login', url: '/login.html' },
  { name: 'companion', url: '/companion.html' },
  { name: 'space', url: '/space.html' },
  { name: 'growth', url: '/growth.html' },
  { name: 'voice-chat', url: '/voice-chat.html' },
  { name: 'questionnaire', url: '/questionnaire.html' },
  { name: 'membership', url: '/membership.html' },
];

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 900, isMobile: false },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true },
  { name: 'mobile-430', width: 430, height: 932, isMobile: true },
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const launchOptions = { headless: true };
  if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  } else if (fs.existsSync(edgePath)) {
    launchOptions.executablePath = edgePath;
  }
  const browser = await chromium.launch(launchOptions);
  const report = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      deviceScaleFactor: viewport.isMobile ? 2 : 1,
    });
    await context.addInitScript(() => {
      localStorage.setItem('neuromate-guide-seen-v168', 'true');
    });

    for (const item of pages) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', msg => {
        if (['error', 'warning'].includes(msg.type())) {
          consoleErrors.push(`${msg.type()}: ${msg.text()}`);
        }
      });
      page.on('pageerror', error => consoleErrors.push(`pageerror: ${error.message}`));

      const target = new URL(item.url, baseUrl).toString();
      try {
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForLoadState('load', { timeout: 12000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const screenshot = `${item.name}-${viewport.name}.png`;
        await page.screenshot({ path: path.join(outDir, screenshot), fullPage: true });
        report.push({ page: item.name, viewport: viewport.name, ok: true, screenshot, consoleErrors });
        if (item.name === 'voice-chat') {
          await page.locator('#voiceSettings').click();
          await page.waitForSelector('#settingsDialog[open]', { timeout: 3000 });
          await page.waitForTimeout(300);
          const settingsScreenshot = `voice-chat-settings-${viewport.name}.png`;
          await page.screenshot({ path: path.join(outDir, settingsScreenshot), fullPage: true });
          report.push({ page: 'voice-chat-settings', viewport: viewport.name, ok: true, screenshot: settingsScreenshot, consoleErrors: [...consoleErrors] });
        }
      } catch (error) {
        report.push({ page: item.name, viewport: viewport.name, ok: false, error: error.message, consoleErrors });
      } finally {
        await page.close();
      }
    }

    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(outDir, 'visual-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`Visual capture finished: ${outDir}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
