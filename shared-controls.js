/* ========== 元知己 · 全局舒适控件 V2.0 ==========
 * 面向情绪脆弱人群的全局交互保障：
 *   1. 一键舒缓：随时呼出呼吸引导遮罩
 *   2. 返回：随时退出当前功能回到首页
 * 所有操作轻柔、无强制、可随时取消。
 */
(function () {
  'use strict';

  // SVG 图标
  const ICONS = {
    breathe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9" opacity=".25"/><circle cx="12" cy="12" r="5" opacity=".5"/><circle cx="12" cy="12" r="2"/></svg>',
    home:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-3v-7H8v7H5a2 2 0 01-2-2v-9z" opacity=".7"/></svg>',
    theme:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" opacity=".8"/></svg>',
    themeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" opacity=".8"/></svg>',
    data:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    close:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'
  };

  function createEl(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  // ---------- 构建浮控条 ----------
  const bar = createEl('div', 'comfort-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', '舒适控制');

  const breatheBtn = createEl('button', 'comfort-btn');
  breatheBtn.type = 'button';
  breatheBtn.innerHTML = ICONS.breathe + '<span>舒缓</span>';
  breatheBtn.setAttribute('aria-label', '一键舒缓：呼吸引导');

  const homeBtn = createEl('button', 'comfort-btn');
  homeBtn.type = 'button';
  homeBtn.innerHTML = ICONS.home + '<span>返回</span>';
  homeBtn.setAttribute('aria-label', '返回首页');

  const dataBtn = createEl('button', 'comfort-btn');
  dataBtn.type = 'button';
  dataBtn.innerHTML = ICONS.data + '<span>数据</span>';
  dataBtn.setAttribute('aria-label', '打开数据管理');

  const themeBtn = createEl('button', 'comfort-btn');
  themeBtn.type = 'button';
  themeBtn.setAttribute('aria-label', '切换主题（海洋暖光 / 莫兰迪疗愈 / 深海）');

  bar.append(themeBtn, breatheBtn, dataBtn, homeBtn);

  // 隐藏后的呼出按钮
  const fab = createEl('button', 'comfort-fab');
  fab.type = 'button';
  fab.setAttribute('aria-label', '展开舒适控制');
  fab.innerHTML = ICONS.breathe;

  // ---------- 构建呼吸遮罩 ----------
  const overlay = createEl('div', 'comfort-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '呼吸引导');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML =
    '<div class="comfort-orb"><span>跟随呼吸</span></div>' +
    '<p class="comfort-text">慢慢吸气，感受空气填满胸腔；再缓缓呼出，让肩膀放松下来。</p>' +
    '<button class="comfort-close" type="button">轻轻结束</button>';

  document.body.append(overlay, bar, fab);

  const dataDialog = createEl('dialog', 'data-dialog');
  dataDialog.innerHTML =
    '<form method="dialog"><button class="dialog-close data-dialog-close" type="submit" aria-label="关闭数据管理">' + ICONS.close + '</button></form>' +
    '<p class="eyebrow">DATA CONTROL</p>' +
    '<h2>数据管理</h2>' +
    '<p>当前是离线演示数据，可以在本机导出、清空或反馈异常。正式部署后再接入服务器账户与审批记录。</p>' +
    '<div class="data-actions">' +
      '<button type="button" data-data-action="export"><strong>导出演示数据</strong><small>保存当前浏览器里的本地记录</small></button>' +
      '<button type="button" data-data-action="clear"><strong>清空本地数据</strong><small>重置星贝、装扮、问卷与登录状态</small></button>' +
      '<button type="button" data-data-action="report"><strong>反馈异常</strong><small>记录为待接入的人工处理入口</small></button>' +
      '<button type="button" data-data-action="leave"><strong>退出陪伴</strong><small>回到首页，并保留安全求助入口</small></button>' +
    '</div>';
  document.body.appendChild(dataDialog);

  // ---------- 登录信息同步 ----------
  function readLoginInitial() {
    try {
      const raw = localStorage.getItem('neuromate-login-user') || localStorage.getItem('neuromate-user-profile') || '';
      const user = raw ? JSON.parse(raw) : null;
      return (user?.initial || user?.nickname || user?.name || user?.account || 'Z').slice(0, 1).toUpperCase();
    } catch (error) {
      return 'Z';
    }
  }
  function readLoginProfile() {
    try {
      const raw = localStorage.getItem('neuromate-login-user') || localStorage.getItem('neuromate-user-profile') || '';
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }
  function syncProfileButtons() {
    const profile = readLoginProfile();
    const name = profile?.name || profile?.nickname || profile?.account || '未登录';
    const loggedIn = Boolean(profile);
    document.querySelectorAll('.profile-button').forEach((button) => {
      button.textContent = readLoginInitial();
      button.title = loggedIn ? `当前用户：${name}，点击切换登录` : '未登录，点击登录';
      button.setAttribute('aria-label', button.title);
      if (!button.dataset.profileBound) {
        button.dataset.profileBound = 'true';
        button.addEventListener('click', () => { window.location.href = 'login.html'; });
      }
    });
    document.querySelectorAll('.journey-link').forEach((link) => {
      if (loggedIn) {
        link.href = 'space.html';
        link.innerHTML = `${name}的空间 <span>↗</span>`;
        link.setAttribute('aria-label', `进入${name}的空间`);
      } else {
        link.href = 'login.html';
        link.innerHTML = '开始旅程 <span>↗</span>';
        link.setAttribute('aria-label', '开始旅程');
      }
    });
  }
  syncProfileButtons();
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === 'neuromate-login-user' || event.key === 'neuromate-user-profile') syncProfileButtons();
  });

  // ---------- 呼吸引导逻辑 ----------
  let breatheTimer = null;
  let breatheStep = 0;

  function runBreathe() {
    const orb = overlay.querySelector('.comfort-orb');
    const textEl = overlay.querySelector('.comfort-text');
    const labelEl = orb.querySelector('span');
    const steps = [
      { cls: 'inhaling', label: '慢慢吸气', text: '让空气温柔地填满你的胸腔……' },
      { cls: '',          label: '停留一下', text: '感受这一刻的平静，什么都不用做。' },
      { cls: 'exhaling', label: '缓缓呼气', text: '把紧绷和疲惫，随着呼吸慢慢放出……' },
      { cls: '',          label: '再停留', text: '你已经做得很好了。' }
    ];
    const durations = [4000, 2000, 6000, 2000];

    function step() {
      const s = steps[breatheStep % 4];
      orb.classList.remove('inhaling', 'exhaling');
      if (s.cls) orb.classList.add(s.cls);
      labelEl.textContent = s.label;
      textEl.textContent = s.text;
      breatheTimer = window.setTimeout(() => {
        breatheStep += 1;
        step();
      }, durations[breatheStep % 4]);
    }
    step();
  }

  function openBreathe() {
    overlay.classList.add('is-open');
    breatheStep = 0;
    runBreathe();
  }

  function closeBreathe() {
    overlay.classList.remove('is-open');
    if (breatheTimer) { window.clearTimeout(breatheTimer); breatheTimer = null; }
  }

  breatheBtn.addEventListener('click', () => {
    if (overlay.classList.contains('is-open')) closeBreathe();
    else openBreathe();
  });
  overlay.querySelector('.comfort-close').addEventListener('click', closeBreathe);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeBreathe();
  });

  // ---------- 主题切换（V1.3：海洋暖光 → 莫兰迪疗愈 → 深海，三态循环） ----------
  const PALETTE_KEY = 'neuromate-palette';
  const PALETTE_ORDER = ['ocean', 'morandi', 'deep'];
  const THEME_COPY = {
    ocean: { name: '海洋暖光', idea: '以深海暖光为底，蓝与橙互为冷暖对望，让情绪在开阔与温暖之间流动。', scene: '适合日常陪伴、需要松弛感与安全感的时刻。' },
    morandi: { name: '莫兰迪疗愈', idea: '降低饱和与对比，用灰调的柔和色彩托住情绪，减少视觉刺激。', scene: '适合情绪低落、易疲劳或需要低打扰阅读环境时。' },
    deep: { name: '深海', idea: '把整片夜色沉入深海，低亮度的深蓝底色让屏幕在暗处也安静、不刺眼。', scene: '适合夜晚、暗光环境，或想要彻底沉静下来的时刻。' }
  };
  const PALETTE_BTN = {
    ocean: { icon: ICONS.theme, label: '海洋' },
    morandi: { icon: ICONS.themeOff, label: '疗愈' },
    deep: { icon: ICONS.themeOff, label: '深海' }
  };
  function applyPalette(palette) {
    if (palette === 'ocean') {
      delete document.body.dataset.palette;
      themeBtn.classList.remove('is-active');
    } else {
      document.body.dataset.palette = palette;
      themeBtn.classList.add('is-active');
    }
    const btn = PALETTE_BTN[palette];
    themeBtn.innerHTML = btn.icon + '<span>' + btn.label + '</span>';
    try { localStorage.setItem(PALETTE_KEY, palette); } catch (e) { /* ignore */ }
  }
  let savedPalette = 'ocean';
  try { savedPalette = localStorage.getItem(PALETTE_KEY) || 'ocean'; } catch (e) { /* ignore */ }
  if (PALETTE_ORDER.indexOf(savedPalette) === -1) savedPalette = 'ocean';
  applyPalette(savedPalette);

  // 主题介绍轻浮层：可关闭、不打断；reduced-motion 下直接展示不播过渡
  const reduceMotionPref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeCard = createEl('div', 'theme-card');
  themeCard.setAttribute('role', 'dialog');
  themeCard.setAttribute('aria-label', '主题介绍');
  themeCard.innerHTML =
    '<button class="theme-card-close" type="button" aria-label="关闭主题介绍">✕</button>' +
    '<span class="theme-card-kicker">当前主题</span>' +
    '<h3 class="theme-card-name"></h3>' +
    '<p class="theme-card-idea"></p>' +
    '<p class="theme-card-scene"></p>';
  document.body.append(themeCard);
  let themeCardTimer = null;
  function showThemeCard(palette) {
    const copy = THEME_COPY[palette];
    themeCard.querySelector('.theme-card-name').textContent = copy.name;
    themeCard.querySelector('.theme-card-idea').textContent = copy.idea;
    themeCard.querySelector('.theme-card-scene').textContent = copy.scene;
    if (reduceMotionPref) themeCard.style.transition = 'none';
    window.clearTimeout(themeCardTimer);
    themeCard.classList.add('is-open');
    themeCardTimer = window.setTimeout(() => themeCard.classList.remove('is-open'), 9000);
  }
  function closeThemeCard() {
    window.clearTimeout(themeCardTimer);
    themeCard.classList.remove('is-open');
  }
  themeCard.querySelector('.theme-card-close').addEventListener('click', closeThemeCard);
  themeCard.addEventListener('click', (event) => { if (event.target === themeCard) closeThemeCard(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && themeCard.classList.contains('is-open')) closeThemeCard();
  });
  themeBtn.addEventListener('click', () => {
    const cur = document.body.dataset.palette || 'ocean';
    const next = PALETTE_ORDER[(PALETTE_ORDER.indexOf(cur) + 1) % PALETTE_ORDER.length];
    applyPalette(next);
    showThemeCard(next);
  });

  function localSnapshot() {
    const keys = [
      'neuromate-login-user',
      'neuromate-user-profile',
      'neuromate-custom-space-v1',
      'neuromate-wallet-v1',
      'neuromate-membership-v1',
      'neuromate-reports-v1',
      'neuromate-avatar-mode-v16',
      'neuromate-mate-nickname-v1',
      'neuromate-api-config-v16',
      'neuromate-api-config-v15',
      'neuromate-palette'
    ];
    return keys.reduce((data, key) => {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) data[key] = value;
      } catch (error) { /* ignore */ }
      return data;
    }, {
      exportedAt: new Date().toISOString(),
      note: '元知己离线演示数据，仅来自当前浏览器。'
    });
  }

  function downloadSnapshot() {
    const blob = new Blob([JSON.stringify(localSnapshot(), null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = createEl('a');
    link.href = url;
    link.download = 'neuromate-local-demo-data.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 300);
    showToast('本地演示数据已导出。');
  }

  function clearLocalDemoData() {
    if (!window.confirm('确认清空当前浏览器里的元知己演示数据吗？')) return;
    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key) => key && key.startsWith('neuromate-'))
      .forEach((key) => {
      try { localStorage.removeItem(key); } catch (error) { /* ignore */ }
    });
    showToast('本地演示数据已清空，页面将刷新。');
    window.setTimeout(() => window.location.reload(), 650);
  }

  dataBtn.addEventListener('click', () => dataDialog.showModal());
  dataDialog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-data-action]');
    if (!button) return;
    const action = button.dataset.dataAction;
    if (action === 'export') downloadSnapshot();
    if (action === 'clear') clearLocalDemoData();
    if (action === 'report') showToast('异常反馈入口已保留，正式版会接入工单和人工处理。');
    if (action === 'leave') {
      dataDialog.close();
      showToast('已退出当前陪伴页面。');
      window.setTimeout(() => { window.location.href = 'index.html'; }, 500);
    }
  });

  // ---------- 返回首页 ----------
  homeBtn.addEventListener('click', () => {
    const isHome = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    if (isHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = 'index.html';
    }
  });

  const GUIDE_KEY = 'neuromate-guide-seen-v168';
  function maybeShowGuide() {
    let seen = false;
    try { seen = localStorage.getItem(GUIDE_KEY) === 'true'; } catch (error) { /* ignore */ }
    if (seen) return;
    const guide = createEl('div', 'onboarding-card');
    guide.innerHTML =
      '<button class="onboarding-close" type="button" aria-label="关闭新手提示">✕</button>' +
      '<p class="eyebrow">FIRST STEP</p>' +
      '<h3>先从一个入口开始。</h3>' +
      '<div><a href="companion.html">数字人陪伴</a><a href="questionnaire.html">状态问卷</a><a href="space.html">换装空间</a></div>';
    document.body.appendChild(guide);
    requestAnimationFrame(() => guide.classList.add('is-open'));
    const closeGuide = () => {
      guide.classList.remove('is-open');
      try { localStorage.setItem(GUIDE_KEY, 'true'); } catch (error) { /* ignore */ }
      window.setTimeout(() => guide.remove(), 220);
    };
    guide.querySelector('.onboarding-close').addEventListener('click', closeGuide);
    window.setTimeout(closeGuide, 9000);
  }
  window.setTimeout(maybeShowGuide, 900);

  // ---------- 浮控条折叠 / 展开（V1.3：滚动方向感知） ----------
  const HIDE_THRESHOLD = 120;
  function hideBar() {
    bar.classList.add('is-hidden');
    fab.classList.add('is-visible');
  }
  function showBar() {
    bar.classList.remove('is-hidden');
    fab.classList.remove('is-visible');
  }
  // 悬停时保持可见；隐藏状态下可通过右下 FAB 随时唤出（含「暂停动效」入口）
  bar.addEventListener('mouseenter', showBar);
  fab.addEventListener('click', showBar);

  // 向下滚动超过 120px 自动隐藏；向上滚动立即重现；页面顶部保持常显
  let lastScroll = window.scrollY || 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > HIDE_THRESHOLD && y > lastScroll) hideBar();
    else if (y <= lastScroll) showBar();
    lastScroll = y;
  }, { passive: true });

  // ---------- 阅读进度条（纯主题色，全站生效） ----------
  const progressBar = createEl('div', 'scroll-progress');
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressBar);
  function updateProgress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    progressBar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  // ---------- V1.5：页面跳转交给浏览器原生处理，减少切换卡顿 ----------

  // ---------- 全局 Toast（如果页面没有自带） ----------
  let toastEl = document.querySelector('#toast');
  if (!toastEl) {
    toastEl = createEl('div', 'toast');
    toastEl.id = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  let toastTimer = null;
  function showToast(message) {
    window.clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  // 暴露给其他脚本
  window.NeuroMateComfort = {
    showToast,
    openBreathe,
    closeBreathe
  };
})();
