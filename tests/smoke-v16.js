const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = process.argv[2] || 'http://localhost:8321';
const outDir = path.join(__dirname, '..', 'test-results', 'after-v1.6');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const launchOptions = { headless: true };
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;
  else if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('neuromate-smoke-cleared')) {
      localStorage.clear();
      sessionStorage.setItem('neuromate-smoke-cleared', 'true');
    }
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const checks = [];
  const record = (name, ok, detail = '') => checks.push({ name, ok, detail });

  try {
    await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load', { timeout: 12000 }).catch(() => {});
    const heroAutoplay = await page.locator('#heroVideo').evaluate((video) => video.hasAttribute('autoplay'));
    assert(!heroAutoplay, '首页背景视频仍在自动播放');
    const heroHasPoster = await page.locator('#heroVideo').evaluate((video) => video.hasAttribute('poster'));
    assert(!heroHasPoster, '首页视频仍有静态人物封面图');
    assert(await page.locator('#heroVideoControl').count() === 1, '首页没有背景视频控制按钮');
    assert(await page.locator('[aria-label="打开数据管理"]').count() === 1, '全局数据管理入口不存在');
    await page.locator('[aria-label="打开数据管理"]').click();
    await page.waitForSelector('.data-dialog[open]', { timeout: 3000 });
    assert((await page.locator('.data-dialog').innerText()).includes('导出演示数据'), '数据管理没有导出入口');
    await page.locator('.data-dialog-close').click();
    const monthText = `${new Date().getMonth() + 1} 月`;
    assert((await page.locator('#homeHeatmapTitle').innerText()).includes(monthText), '首页成长预览没有跟随当前月份');
    await page.locator('[data-reply="sort"]').click();
    await page.waitForTimeout(700);
    assert((await page.locator('#homeConversation').innerText()).includes('事实'), '首页快捷对话没有生成回应');
    await page.locator('[data-tool="breath"]').click();
    await page.waitForSelector('#homeDialog[open]', { timeout: 3000 });
    await page.locator('#dialogAction').click();
    assert((await page.locator('#dialogAction').innerText()).includes('暂停'), '首页呼吸练习按钮没有启动');
    await page.locator('#homeDialog .dialog-close').click();
    assert((await page.locator('body').innerText()).includes('评委') === false, '首页还残留评委视角文案');
    record('首页视频保留、取消人物封面，快捷按钮可用', true);

    await page.goto(new URL('/login.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    assert(await page.locator('#loginForm button[type="submit"]').count() === 1, '登录页没有提交按钮');
    assert(await page.locator('#guestButton').count() === 1, '登录页没有游客入口');
    await page.locator('#guestButton').click();
    await page.waitForFunction(() => window.location.pathname.endsWith('/space.html'), { timeout: 8000 });
    record('登录页按钮可见，游客入口可进入我的空间', true);

    await page.goto(new URL('/companion.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const avatarButtons = page.locator('button[data-avatar-mode]');
    const names = await avatarButtons.evaluateAll((buttons) => buttons.map((button) => button.textContent.trim()));
    const expected = ['元安', '元晴', '元澈', '虹色Mao', '元元熊猫', '元瑶', '元初'];
    assert(JSON.stringify(names) === JSON.stringify(expected), `数字人顺序不对：${names.join('、')}`);
    assert(!names.includes('元熙'), '数字人列表仍包含元熙');
    assert(await page.locator('button[data-avatar-mode="yuanan"].active').count() === 1, '默认数字人不是元安');
    assert(await page.locator('a[href="api-config.html"]').count() === 0, '数字人页仍显示 API 配置入口');
    await page.locator('[data-palette="warm"]').click();
    const warmPlaceholder = await page.locator('#companionInput').getAttribute('placeholder');
    assert(warmPlaceholder.includes('接住'), '心情调色盘没有更新输入提示');
    record('数字人默认元安、顺序正确、隐藏 API 入口', true);

    await page.locator('[data-scene="rain"]').click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, 'companion-rain-desktop-1366.png'), fullPage: false });
    const rainActive = await page.locator('[data-scene="rain"].active').count();
    assert(rainActive === 1, '雨天按钮没有切换为选中状态');
    record('数字人雨天场景可切换并已截图', true, 'companion-rain-desktop-1366.png');

    await page.goto(new URL('/space.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    assert(await page.locator('[data-avatar-id="yuanan"].active').count() === 1, '我的空间默认不是元安');
    assert(!(await page.locator('body').innerText()).includes('元熙'), '我的空间仍出现元熙');
    const lockedText = await page.locator('.shop-item').first().innerText();
    assert(lockedText.includes('当前形象暂不支持'), '我的空间未明确提示当前形象不支持装扮');
    await page.locator('#signinButton').click();
    await page.locator('#gachaOpen').click();
    await page.locator('#gachaDraw').click();
    await page.waitForSelector('.draw-stage.is-revealed', { timeout: 5000 });
    assert(pageErrors.length === 0, `我的空间交互出现脚本错误：${pageErrors.join('; ')}`);
    record('我的空间默认元安、禁用不支持装扮，抽卡不报错', true);

    await page.goto(new URL('/voice-chat.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    assert(await page.locator('a[href="api-config.html"]').count() === 0, '语音页仍显示 API 配置入口');
    assert(!(await page.locator('body').innerText()).includes('元熙'), '语音页仍出现元熙');
    assert((await page.locator('body').innerText()).includes('当前为本地演示'), '语音页没有清楚说明当前演示状态');
    await page.locator('#voiceSettings').click();
    await page.waitForSelector('#settingsDialog[open]', { timeout: 3000 });
    assert((await page.locator('#voiceCurrentText').innerText()).includes('语速'), '语音设置没有显示实际音色和语速');
    await page.locator('#voiceRefresh').click();
    await page.locator('#settingsDialog .dialog-close').click();
    record('语音页隐藏 API 入口、说明本地演示，并显示实际音色', true);

    await page.goto(new URL('/membership.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const membershipText = await page.locator('body').innerText();
    assert(!membershipText.includes('元熙') && !membershipText.includes('小舟') && !membershipText.includes('爱丽丝'), '会员页仍出现元熙分支内容');
    assert(membershipText.includes('数字人形象 · 元瑶'), '会员页缺少元瑶形象领取入口');
    assert(!membershipText.includes('不参与抽取'), '会员页仍保留与空间页冲突的抽取文案');
    await page.locator('[data-billing="year"]').click();
    assert(await page.locator('[data-billing="year"].active').count() === 1, '会员页年付切换没有选中态');
    await page.locator('[data-plan="plus"]').click();
    await page.waitForSelector('#planDialog[open]', { timeout: 3000 });
    await page.locator('#planConfirm').click();
    await page.waitForTimeout(500);
    assert(await page.locator('[data-plan-card="plus"].is-current').count() === 1, '会员套餐确认后选中态不正确');
    record('会员页删除元熙分支、补齐元瑶，套餐和星贝规则统一', true);

    await page.goto(new URL('/growth.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const currentMonthTitle = await page.locator('#monthTitle').innerText();
    assert(currentMonthTitle.includes(`${new Date().getFullYear()} 年 ${new Date().getMonth() + 1} 月`), `成长中心月份没有跟随当前时间：${currentMonthTitle}`);
    assert((await page.locator('body').innerText()).includes('离线示例数据'), '成长中心没有说明示例数据');
    record('成长中心使用当前月份并标注示例数据', true);

    await page.locator('[aria-label^="切换主题"]').click();
    await page.locator('[aria-label^="切换主题"]').click();
    assert(await page.locator('body[data-palette="deep"]').count() === 1, '主题没有切换到深海');
    await page.goto(new URL('/voice-chat.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    assert(await page.locator('body[data-palette="deep"]').count() === 1, '主题没有跨页保持');
    record('全局主题可切换并跨页保持', true);

    const chatResponse = await page.evaluate(async () => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: '你好' })
      });
      return { ok: res.ok, text: await res.text() };
    });
    assert(chatResponse.ok && chatResponse.text.length > 0, '本地聊天接口不可用');
    const agentResponse = await page.evaluate(async () => {
      const res = await fetch('/api/agent-cluster/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '我有点焦虑' })
      });
      return { ok: res.ok, text: await res.text() };
    });
    assert(agentResponse.ok && agentResponse.text.length > 0, '本地 Agent 接口不可用');
    record('离线本地接口可用', true);

    await page.goto(new URL('/questionnaire.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    const questionnaireHtml = await page.content();
    assert(!questionnaireHtml.includes('短信至 12356'), '问卷页仍有短信至 12356 的误导说法');
    await page.locator('#startAssessment').click();
    for (let i = 0; i < 7; i += 1) {
      await page.locator('#answerList button').nth(3).click();
      await page.waitForTimeout(450);
    }
    await page.waitForSelector('#crisisSupport:not([hidden])', { timeout: 5000 });
    assert(await page.locator('#copyHotline').count() === 1, '问卷高分结果没有复制热线按钮');
    record('问卷高分热线入口文案正确', true);
    assert(pageErrors.length === 0, `页面脚本错误：${pageErrors.join('; ')}`);
  } catch (error) {
    record('测试中断', false, error.message);
    throw error;
  } finally {
    fs.writeFileSync(path.join(outDir, 'smoke-report.json'), JSON.stringify(checks, null, 2), 'utf8');
    await browser.close();
  }

  console.log(`Smoke checks finished: ${path.join(outDir, 'smoke-report.json')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
