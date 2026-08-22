(function () {
  'use strict';

  const storageKey = 'neuromate-custom-space-v1';
  const wallet = window.NeurWallet;
  const ws = wallet.state;
  const avatarRegistry = window.NeuroMateAvatarRegistry;
  const avatarKey = window.NEUROMATE_AVATAR_KEY || 'neuromate-avatar-mode-v16';
  const defaults = {
    level: 12,
    affection: 86,
    expression: 'smile',
    equipped: { clothes: 'star', accessories: 'none', appearance: 'clear' }
  };
  const lookNames = {
    clothes: { star: '星星套装', moon: '月光套装', sun: '阳光套装', cloud: '云朵套装', campus: '校园形象', sweater: '治愈系毛衣' },
    accessories: { none: '无配饰', bow: '蝴蝶结', 'cat-ears': '猫耳', 'star-wand': '星星手杖', 'round-glasses': '圆框眼镜', hat: '月影礼帽', glasses: '专注镜框', flower: '安睡花环' },
    appearance: { clear: '清透神态', soft: '柔和神态', bright: '明亮神态' }
  };
  const costumeSymbols = { star: '★', moon: '☾', sun: '☀', cloud: '☁', campus: '✎', sweater: '♨' };
  const accessorySymbols = { none: '', bow: '🎀', 'cat-ears': '🐱', 'star-wand': '🪄', 'round-glasses': '👓', hat: '▲', glasses: '∞', flower: '✿ ✿ ✿' };
  const expressionCopy = {
    smile: '今天想让我换成什么样子？',
    focus: '专注模式准备好了，我们慢慢来。',
    cheer: '这个选择很适合今天的你。',
    quiet: '我会安静地陪在这里。'
  };

  function loadState() {
    const clean = structuredClone(defaults);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return clean;
      if (!ws.legacySpace && (saved.coins || saved.gems)) {
        wallet.earn((saved.coins || 0) * 10 + (saved.gems || 0) * 100);
        if (saved.owned) Object.values(saved.owned).flat().forEach((id) => wallet.own(id));
        ws.legacySpace = true;
        wallet.save();
      }
      return {
        level: Number.isFinite(saved.level) ? saved.level : clean.level,
        affection: Number.isFinite(saved.affection) ? saved.affection : clean.affection,
        expression: typeof saved.expression === 'string' ? saved.expression : clean.expression,
        equipped: { ...clean.equipped, ...(saved.equipped || {}) }
      };
    } catch (error) {
      return clean;
    }
  }

  const state = loadState();
  const toast = document.querySelector('#toast');
  const avatarPortrait = document.querySelector('#avatarPortrait');
  const avatarImage = document.querySelector('#avatarImage');
  const avatarVideo = document.querySelector('#avatarVideo');
  const spaceAvatarName = document.querySelector('#spaceAvatarName');
  const spaceAvatarMeta = document.querySelector('#spaceAvatarMeta');
  const spaceAvatarTabs = document.querySelector('#spaceAvatarTabs');
  const costumeMark = document.querySelector('#costumeMark');
  const accessoryMark = document.querySelector('#accessoryMark');
  const mateReaction = document.querySelector('#mateReaction');
  const affectionGain = document.querySelector('#affectionGain');
  const giftBurst = document.querySelector('#giftBurst');
  let toastTimer;

  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* Prototype can run without storage. */ }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function renderWallet(pulse) {
    const chip = document.querySelector('.space-wallet > span');
    document.querySelector('#starbellValue').textContent = wallet.format(ws.starbell);
    if (pulse) {
      chip.classList.remove('is-pulsing');
      void chip.offsetWidth;
      chip.classList.add('is-pulsing');
    }
    document.querySelector('#levelValue').textContent = state.level;
    document.querySelector('#affectionValue').textContent = state.affection;
    document.querySelector('#affectionFill').style.width = `${state.affection}%`;
    document.querySelector('#affectionHint').textContent = state.affection >= 100 ? '已解锁专属问候' : `再增加 ${100 - state.affection} 点解锁专属问候`;
  }

  function renderItems() {
    document.querySelectorAll('.shop-item').forEach((button) => {
      const category = button.dataset.category;
      const item = button.dataset.item;
      const owned = true;
      const active = state.equipped[category] === item;
      const itemState = button.querySelector('.item-state');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      if (active) itemState.textContent = '使用中';
      else if (owned) itemState.textContent = '已拥有';
      else itemState.textContent = `✦ ${wallet.format(Number(button.dataset.cost))}`;
    });
    document.querySelectorAll('[data-category="appearance"]').forEach((button) => {
      const active = state.equipped.appearance === button.dataset.item;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  const storeCollectibles = {
    'campus-coat': ['衣', '校园风外套'],
    'heal-sweater': ['柔', '治愈系毛衣'],
    'tech-jacket': ['光', '科技感夹克'],
    'calm-skin': ['稳', '「沉住气」完整皮肤'],
    'star-room': ['星', '星空自习室'],
    'forest-calm': ['森', '森林冥想场'],
    'deep-sea': ['雨', '深海雨幕'],
    'memory-card': ['忆', '陪伴记忆卡'],
    'story-pack': ['节', '节日剧情包']
  };

  function renderStoreCollection() {
    const box = document.querySelector('#storeCollection');
    const chips = document.querySelector('#storeChips');
    chips.replaceChildren();
    Object.entries(storeCollectibles).forEach(([id, pair]) => {
      if (!wallet.has(id)) return;
      const chip = document.createElement('i');
      const mark = document.createElement('b');
      mark.textContent = pair[0];
      chip.appendChild(mark);
      chip.appendChild(document.createTextNode(pair[1]));
      chips.appendChild(chip);
    });
    box.hidden = !chips.children.length;
  }

  function animateAvatar() {
    avatarPortrait.classList.remove('is-changing');
    void avatarPortrait.offsetWidth;
    avatarPortrait.classList.add('is-changing');
  }

  function speak(message) {
    mateReaction.textContent = message;
    mateReaction.classList.remove('is-speaking');
    void mateReaction.offsetWidth;
    mateReaction.classList.add('is-speaking');
  }

  function applyLook(animate) {
    syncCurrentAvatar();
    avatarPortrait.className = `avatar-portrait theme-${state.equipped.clothes} accessory-${state.equipped.accessories}`;
    avatarImage.className = `appearance-${state.equipped.appearance}`;
    costumeMark.textContent = costumeSymbols[state.equipped.clothes];
    accessoryMark.textContent = accessorySymbols[state.equipped.accessories];
    document.querySelector('#lookLabel').textContent = `${lookNames.clothes[state.equipped.clothes]} · ${lookNames.accessories[state.equipped.accessories]} · ${lookNames.appearance[state.equipped.appearance]}`;
    if (animate) animateAvatar();
  }

  function burst(symbol, color, count) {
    giftBurst.replaceChildren();
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement('i');
      const angle = Math.PI * 2 * index / count + Math.random() * .35;
      const distance = 80 + Math.random() * 120;
      particle.textContent = symbol;
      particle.style.setProperty('--fly-x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--fly-y', `${Math.sin(angle) * distance - 30}px`);
      particle.style.setProperty('--burst-size', `${12 + Math.random() * 16}px`);
      particle.style.setProperty('--burst-color', color);
      giftBurst.appendChild(particle);
    }
    window.setTimeout(() => giftBurst.replaceChildren(), 1200);
  }

  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.shop-panel').forEach((panel) => {
      const active = panel.id === `panel-${button.dataset.tab}`;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  }));

  document.querySelectorAll('.shop-item, [data-category="appearance"]').forEach((button) => button.addEventListener('click', () => {
    const category = button.dataset.category;
    const item = button.dataset.item;
    wallet.own(item);
    state.equipped[category] = item;
    saveState();
    renderWallet(true);
    renderItems();
    applyLook(true);
    burst(costumeSymbols[state.equipped.clothes] || '✦', '#edc56d', 10);
    speak(`${button.dataset.name}已经换好了。`);
  }));

  function activeAvatar() {
    return avatarRegistry ? avatarRegistry.get(avatarRegistry.load()) : null;
  }

  function avatarPreviewSrc(info) {
    if (!info) return 'assets/yuanchu-card.svg';
    if (info.outfitImages) {
      const acc = state.equipped.accessories;
      const clothes = state.equipped.clothes;
      return info.outfitImages[acc] || info.outfitImages[clothes] || info.outfitImages.default || info.preview || info.model;
    }
    if (info.id === 'yuanchu') return info.preview || 'assets/yuanchu-card.svg';
    if (info.render === 'live2d' || info.render === 'vrm') return 'assets/digital-human.png';
    if (info.preview && !info.preview.includes('yuanchu-card.svg')) return info.preview;
    const color = encodeURIComponent(info.color || '#8fb6cc');
    const name = encodeURIComponent(info.name || '元知己');
    const short = encodeURIComponent(info.short || (info.name || '元').slice(0, 1));
    const type = encodeURIComponent(info.type || '数字人');
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='34%25' r='65%25'%3E%3Cstop offset='0' stop-color='white' stop-opacity='.9'/%3E%3Cstop offset='1' stop-color='${color}' stop-opacity='.32'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='640' height='420' rx='36' fill='url(%23g)'/%3E%3Ccircle cx='320' cy='178' r='92' fill='${color}' fill-opacity='.92'/%3E%3Ctext x='320' y='206' text-anchor='middle' font-size='86' font-family='Microsoft YaHei, sans-serif' fill='white'%3E${short}%3C/text%3E%3Ctext x='320' y='318' text-anchor='middle' font-size='42' font-family='Microsoft YaHei, sans-serif' fill='%23172532'%3E${name}%3C/text%3E%3Ctext x='320' y='360' text-anchor='middle' font-size='22' font-family='Microsoft YaHei, sans-serif' fill='%2371808b'%3E${type}%3C/text%3E%3C/svg%3E`;
  }

  function syncCurrentAvatar() {
    const info = activeAvatar();
    if (!info) return;
    if (spaceAvatarName) spaceAvatarName.textContent = info.name;
    if (spaceAvatarMeta) spaceAvatarMeta.textContent = `${info.type} · ${info.role}`;
    if (avatarPortrait) avatarPortrait.classList.toggle('is-video-preview', info.render === 'video');
    if (avatarImage) {
      avatarImage.hidden = info.render === 'video';
      avatarImage.src = avatarPreviewSrc(info);
      avatarImage.alt = `${info.name}形象预览`;
    }
    if (avatarVideo) {
      avatarVideo.hidden = info.render !== 'video';
      if (info.render === 'video') {
        avatarVideo.src = info.model;
        avatarVideo.play().catch(() => {});
      } else {
        avatarVideo.pause();
        avatarVideo.removeAttribute('src');
      }
    }
    if (document.querySelector('.companion-link')) document.querySelector('.companion-link').innerHTML = `去和${info.name}聊天 <span>→</span>`;
    if (spaceAvatarTabs) {
      spaceAvatarTabs.querySelectorAll('button[data-avatar-id]').forEach((button) => {
        const active = button.dataset.avatarId === info.id;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
  }

  function renderAvatarTabs() {
    if (!spaceAvatarTabs || !avatarRegistry) return;
    spaceAvatarTabs.replaceChildren();
    avatarRegistry.all.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.avatarId = item.id;
      button.textContent = item.name;
      button.title = `${item.name} · ${item.type}`;
      button.style.setProperty('--avatar-color', item.color || '#9fb7c2');
      button.addEventListener('click', () => {
        avatarRegistry.save(item.id);
        syncCurrentAvatar();
        showToast(`${item.name}已同步。`);
      });
      spaceAvatarTabs.appendChild(button);
    });
    syncCurrentAvatar();
  }

  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === avatarKey || event.key === storageKey) {
      syncCurrentAvatar();
      applyLook(false);
      renderItems();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncCurrentAvatar();
      applyLook(false);
    }
  });

  document.querySelectorAll('[data-expression]').forEach((button) => button.addEventListener('click', () => {
    state.expression = button.dataset.expression;
    document.querySelectorAll('[data-expression]').forEach((item) => item.classList.toggle('active', item === button));
    speak(expressionCopy[state.expression]);
    burst(state.expression === 'cheer' ? '★' : '✦', '#efc6bd', 8);
    saveState();
  }));

  const giftDialog = document.querySelector('#giftDialog');
  document.querySelector('#giftOpen').addEventListener('click', () => giftDialog.showModal());
  document.querySelectorAll('[data-gift]').forEach((button) => button.addEventListener('click', () => {
    const cost = Number(button.dataset.cost);
    const gain = Number(button.dataset.affection);
    if (!wallet.spend(cost)) {
      showToast('星贝不足，暂时无法送出这份礼物。');
      return;
    }
    const actualGain = Math.min(gain, 100 - state.affection);
    state.affection = Math.min(100, state.affection + gain);
    affectionGain.textContent = `+${actualGain}`;
    affectionGain.classList.remove('show');
    void affectionGain.offsetWidth;
    affectionGain.classList.add('show');
    burst(button.dataset.symbol, cost >= 500 ? '#c5b7e6' : '#ef9a8a', 16);
    speak(actualGain ? `谢谢你的${button.querySelector('strong').textContent}，我会好好收下。` : '亲密度已经满了，这份心意我也收到了。');
    renderWallet(true);
    saveState();
    window.setTimeout(() => giftDialog.close(), 520);
  }));

  /* ===== 每日签到与星轨抽卡（合规卡池：概率公示 + 80 抽保底 + 每日上限） ===== */
  const PAID_DRAW_COST = 300;
  const PAID_DRAW_DAILY_LIMIT = 5;
  const PITY_MAX = 80;
  const starPool = [
    { tier: 'SSR', kind: 'clothes', item: 'moon', name: '月光套装', symbol: '☾', rate: 2, dup: 1500 },
    { tier: 'SR', kind: 'clothes', item: 'cloud', name: '云朵套装', symbol: '☁', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'clothes', item: 'campus', name: '校园形象', symbol: '✎', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'clothes', item: 'sweater', name: '治愈系毛衣', symbol: '♨', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'accessories', item: 'flower', name: '安睡花环', symbol: '✿', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'accessories', item: 'glasses', name: '专注镜框', symbol: '∞', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'accessories', item: 'bow', name: '蝴蝶结', symbol: '🎀', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'accessories', item: 'cat-ears', name: '猫耳', symbol: '🐱', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'accessories', item: 'star-wand', name: '星星手杖', symbol: '🪄', rate: 6, dup: 400 },
    { tier: 'SR', kind: 'accessories', item: 'round-glasses', name: '圆框眼镜', symbol: '👓', rate: 6, dup: 400 },
    { tier: 'R', kind: 'clothes', item: 'sun', name: '阳光套装', symbol: '☀', rate: 20, dup: 100 },
    { tier: 'R', kind: 'accessories', item: 'hat', name: '月影礼帽', symbol: '▲', rate: 20, dup: 100 },
    { tier: 'R', kind: 'starbell', name: '星贝福袋', symbol: '✦', rate: 20, amount: 200 },
    { tier: 'R', kind: 'affection', name: '心意卡', symbol: '心', rate: 20, amount: 5 }
  ];

  const dateString = wallet.dateString;

  function paidDrawsToday() {
    return ws.paidDrawsDate === dateString() ? ws.paidDraws : 0;
  }

  const signinButton = document.querySelector('#signinButton');
  const signinWeek = document.querySelector('#signinWeek');
  const oddsDialog = document.querySelector('#oddsDialog');
  const gachaDialog = document.querySelector('#gachaDialog');
  const drawStage = document.querySelector('#drawStage');
  const drawSymbol = document.querySelector('#drawSymbol');
  const drawName = document.querySelector('#drawName');
  const drawRarity = document.querySelector('#drawRarity');
  const drawMessage = document.querySelector('#drawMessage');
  const gachaDraw = document.querySelector('#gachaDraw');

  function renderGacha() {
    document.querySelector('#streakValue').textContent = ws.streak;
    document.querySelector('#ticketValue').textContent = ws.tickets;
    const signedToday = ws.lastSignin === dateString();
    signinButton.disabled = signedToday;
    signinButton.textContent = signedToday ? '今日已签到，明天再来' : '今日签到 · 领 1 次抽取';
    const filled = ws.streak === 0 ? 0 : ((ws.streak - 1) % 7) + 1;
    signinWeek.querySelectorAll('i').forEach((cell, index) => cell.classList.toggle('on', index < filled));
    const left = PAID_DRAW_DAILY_LIMIT - paidDrawsToday();
    document.querySelector('#drawLeftValue').textContent = left;
    document.querySelector('#pityFill').style.width = `${Math.min(ws.pity / PITY_MAX, 1) * 100}%`;
    document.querySelector('#pityHint').textContent = ws.pity === 0
      ? `再抽 ${PITY_MAX} 次内必出 SSR`
      : `已连续 ${ws.pity} 抽未出 SSR，第 ${PITY_MAX} 抽必出`;
  }

  signinButton.addEventListener('click', () => {
    const today = dateString();
    if (ws.lastSignin === today) return;
    ws.streak = ws.lastSignin === dateString(-1) ? ws.streak + 1 : 1;
    ws.lastSignin = today;
    const bonus = ws.streak % 7 === 0 ? 3 : 1;
    ws.tickets += bonus;
    wallet.save();
    renderGacha();
    if (bonus > 1) showToast(`连续签到 ${ws.streak} 天：+3 次免费抽取（含连签奖励）。`);
    else showToast(`签到成功：+1 次免费抽取，已连续 ${ws.streak} 天。`);
  });

  document.querySelector('#oddsOpen').addEventListener('click', () => oddsDialog.showModal());

  function rollPrize() {
    if (ws.pity >= PITY_MAX - 1) return starPool[0];
    const roll = Math.random() * 100;
    let cursor = 0;
    for (const prize of starPool) {
      cursor += prize.rate;
      if (roll < cursor) return prize;
    }
    return starPool[starPool.length - 1];
  }

  function nextDrawMode() {
    if (ws.tickets > 0) return 'ticket';
    if (paidDrawsToday() < PAID_DRAW_DAILY_LIMIT && ws.starbell >= PAID_DRAW_COST) return 'paid';
    return null;
  }

  function updateDrawButton() {
    const mode = nextDrawMode();
    gachaDraw.disabled = !mode;
    if (mode === 'ticket') gachaDraw.textContent = `免费抽取（剩余 ${ws.tickets} 次）`;
    else if (mode === 'paid') gachaDraw.textContent = `再抽一次 · ✦ ${PAID_DRAW_COST}`;
    else gachaDraw.textContent = '今日抽取次数已用完';
  }

  document.querySelector('#gachaOpen').addEventListener('click', () => {
    if (!nextDrawMode()) {
      showToast('今日抽取次数已用完，明天签到还能再领。');
      return;
    }
    drawStage.className = 'draw-stage';
    drawSymbol.textContent = '?';
    drawName.textContent = '等待抽取';
    drawRarity.textContent = '概率已公示';
    drawMessage.textContent = '卡池只含装扮与福袋，保底进度会在抽取后更新。';
    updateDrawButton();
    gachaDialog.showModal();
  });

  gachaDraw.addEventListener('click', () => {
    const mode = nextDrawMode();
    if (!mode) {
      updateDrawButton();
      return;
    }
    if (mode === 'ticket') {
      ws.tickets -= 1;
    } else {
      ws.starbell -= PAID_DRAW_COST;
      if (ws.paidDrawsDate !== dateString()) {
        ws.paidDrawsDate = dateString();
        ws.paidDraws = 0;
      }
      ws.paidDraws += 1;
    }
    wallet.save();
    renderWallet(true);
    gachaDraw.disabled = true;
    drawStage.className = 'draw-stage is-drawing';
    drawSymbol.textContent = '✦';
    drawName.textContent = '星轨检索中';
    drawRarity.textContent = '请稍候';
    drawMessage.textContent = '装扮正在靠近……';
    window.setTimeout(() => {
      const prize = rollPrize();
      let resultMessage;
      if (prize.kind === 'starbell') {
        wallet.earn(prize.amount);
        resultMessage = `福袋已开启：+${wallet.format(prize.amount)} 星贝。`;
      } else if (prize.kind === 'affection') {
        state.affection = Math.min(100, state.affection + prize.amount);
        resultMessage = `心意卡已收下：亲密度 +${prize.amount}。`;
      } else {
        const duplicate = wallet.has(prize.item);
        if (duplicate) {
          wallet.earn(prize.dup);
          resultMessage = `已拥有该装扮，自动转化为 ✦ ${wallet.format(prize.dup)} 星贝。`;
        } else {
          wallet.own(prize.item);
          resultMessage = '新装扮已自动加入衣橱并穿戴。';
        }
        state.equipped[prize.kind] = prize.item;
      }
      ws.pity = prize.tier === 'SSR' ? 0 : ws.pity + 1;
      drawStage.className = `draw-stage is-revealed tier-${prize.tier.toLowerCase()}`;
      drawSymbol.textContent = prize.symbol;
      drawName.textContent = prize.name;
      drawRarity.textContent = prize.tier === 'SSR' ? 'SSR · 稀有' : `${prize.tier} · ${prize.tier === 'SR' ? '珍藏' : '常规'}`;
      drawMessage.textContent = resultMessage;
      render();
      renderWallet();
      renderItems();
      applyLook(true);
      burst(prize.symbol, '#edc56d', 18);
      speak(prize.kind === 'starbell' || prize.kind === 'affection' ? `抽到了${prize.name}，我帮你收好了。` : `抽到了${prize.name}，现在就试试看。`);
      saveState();
      wallet.save();
      renderGacha();
      updateDrawButton();
    }, 1350);
  });

  const mateStage = document.querySelector('#mateStage');
  mateStage.addEventListener('pointermove', (event) => {
    const bounds = mateStage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    avatarPortrait.style.setProperty('--tilt-x', `${x * 7}deg`);
    avatarPortrait.style.setProperty('--tilt-y', `${y * -5}deg`);
  });
  mateStage.addEventListener('pointerleave', () => {
    avatarPortrait.style.setProperty('--tilt-x', '0deg');
    avatarPortrait.style.setProperty('--tilt-y', '0deg');
  });

  const particleStage = document.querySelector('#spaceParticles');
  for (let index = 0; index < 18; index += 1) {
    const particle = document.createElement('i');
    particle.style.setProperty('--x', `${8 + Math.random() * 84}%`);
    particle.style.setProperty('--y', `${5 + Math.random() * 82}%`);
    particle.style.setProperty('--size', `${3 + Math.random() * 6}px`);
    particle.style.setProperty('--duration', `${2.6 + Math.random() * 3.2}s`);
    particle.style.setProperty('--delay', `${-Math.random() * 4}s`);
    particleStage.appendChild(particle);
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
  }, { threshold: .14 });
  document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

  renderWallet();
  renderAvatarTabs();
  renderItems();
  renderStoreCollection();
  applyLook(false);
  renderGacha();
  document.querySelectorAll('[data-expression]').forEach((button) => button.classList.toggle('active', button.dataset.expression === state.expression));
})();
