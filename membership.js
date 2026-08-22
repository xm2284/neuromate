(function () {
  'use strict';

  const storageKey = 'neuromate-membership-v1';
  const wallet = window.NeurWallet;
  const ws = wallet.state;
  const defaults = {
    plan: 'free',
    billing: 'month',
    packs: [],
    invites: 0
  };

  const planMeta = {
    plus: { kicker: 'STUDENT PLAN · PLUS', title: '进阶版 · PLUS', month: '19.9', year: '159' },
    pro: { kicker: 'STUDENT PLAN · PRO', title: '高级版 · PRO', month: '39.9', year: '299' }
  };

  const packMeta = {
    firstaid: {
      title: '考前急救包',
      detail: ['考前 5 分钟稳定呼吸训练', '考场流程分步预演', '紧张时刻的自我对话脚本', '考前一晚降载清单']
    },
    procrastination: {
      title: '拖延修复包',
      detail: ['拖延原因快速分析', '15 分钟任务拆解卡', '启动仪式的三个小步骤', '完成后的自我肯定记录']
    },
    review: {
      title: '深度复盘包',
      detail: ['错题与压力双维度复盘', '考前考后的情绪波动回顾', '下一阶段计划生成', '给下一次考试的一封信']
    },
    sleep: {
      title: '睡眠恢复包',
      detail: ['睡前 10 分钟放松引导', '明日任务降载计划', '作息提醒设置', '一周睡眠趋势小结']
    }
  };
  const avatarItemMap = {
    'avatar-yuanan': 'yuanan',
    'avatar-yuanqing': 'yuanqing',
    'avatar-yuanxi': 'yuanxi',
    'avatar-yuanche': 'yuanche',
    'avatar-mao': 'mao',
    'avatar-panda': 'panda',
    'avatar-yuanchu': 'yuanchu'
  };

  function loadState() {
    const clean = structuredClone(defaults);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return clean;
      if (!ws.legacyMembership) {
        if (Number.isFinite(saved.starbell)) wallet.earn(saved.starbell - 800);
        if (Array.isArray(saved.owned)) saved.owned.forEach((id) => wallet.own(id));
        ws.legacyMembership = true;
        wallet.save();
      }
      return {
        ...clean,
        plan: saved.plan || clean.plan,
        billing: saved.billing || clean.billing,
        packs: Array.isArray(saved.packs) ? saved.packs : clean.packs,
        invites: Number.isFinite(saved.invites) ? saved.invites : clean.invites
      };
    } catch (error) {
      return clean;
    }
  }

  const state = loadState();
  const toast = document.querySelector('#toast');
  let toastTimer;
  let pendingPlan = null;
  let pendingRecharge = null;
  let pendingPack = null;

  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* 原型环境允许无存储运行。 */ }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function renderWallet(pulse) {
    const chip = document.querySelector('.membership-wallet > span');
    document.querySelector('#starbellValue').textContent = wallet.format(ws.starbell);
    if (pulse) {
      chip.classList.remove('is-pulsing');
      void chip.offsetWidth;
      chip.classList.add('is-pulsing');
    }
  }

  /* ===== 计费周期切换 ===== */
  function renderBilling() {
    document.querySelectorAll('[data-billing]').forEach((button) => {
      button.classList.toggle('active', button.dataset.billing === state.billing);
    });
    document.querySelectorAll('.plan-grid strong[data-month]').forEach((price) => {
      const value = state.billing === 'year' ? price.dataset.year : price.dataset.month;
      const heading = price.closest('h3');
      heading.classList.remove('price-changing');
      void heading.offsetWidth;
      price.textContent = `¥${value}`;
      heading.querySelector('.price-unit').textContent = state.billing === 'year' ? '/ 年' : '/ 月';
      heading.classList.add('price-changing');
    });
  }

  document.querySelectorAll('[data-billing]').forEach((button) => button.addEventListener('click', () => {
    if (state.billing === button.dataset.billing) return;
    state.billing = button.dataset.billing;
    saveState();
    renderBilling();
  }));

  /* ===== 会员订阅 ===== */
  const planDialog = document.querySelector('#planDialog');
  const planConfirm = document.querySelector('#planConfirm');

  function renderPlans() {
    document.querySelectorAll('[data-plan-card]').forEach((card) => {
      const key = card.dataset.planCard;
      const current = state.plan === key;
      card.classList.toggle('is-current', current);
      let label = card.querySelector('.current-label');
      if (current && !label) {
        label = document.createElement('i');
        label.className = 'current-label';
        label.textContent = '当前方案';
        card.prepend(label);
      } else if (!current && label) {
        label.remove();
      }
      const button = card.querySelector('[data-plan]');
      if (key === 'free') {
        button.disabled = state.plan === 'free';
        button.innerHTML = state.plan === 'free' ? '当前可用 <span>✓</span>' : '切回基础版 <span>→</span>';
      } else if (current) {
        button.disabled = true;
        button.innerHTML = '正在同行中 <span>✓</span>';
      } else {
        button.disabled = false;
        button.innerHTML = key === 'plus' ? '升级进阶 <span>→</span>' : '开启共鸣 <span>→</span>';
      }
    });
  }

  document.querySelectorAll('[data-plan]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.plan;
    if (key === 'free') {
      if (state.plan !== 'free') {
        state.plan = 'free';
        saveState();
        renderPlans();
        showToast('已切回基础版，核心陪伴会一直免费。');
      }
      return;
    }
    pendingPlan = key;
    const meta = planMeta[key];
    const price = state.billing === 'year' ? meta.year : meta.month;
    document.querySelector('#planDialogKicker').textContent = meta.kicker;
    document.querySelector('#planDialogTitle').textContent = meta.title;
    document.querySelector('#planDialogPrice').textContent = `¥${price} / ${state.billing === 'year' ? '年' : '月'}`;
    planDialog.showModal();
  }));

  planConfirm.addEventListener('click', () => {
    if (!pendingPlan) return;
    state.plan = pendingPlan;
    saveState();
    renderPlans();
    planDialog.close();
    showToast(`已开启${planMeta[pendingPlan].title} 7 天免费体验，随时可取消。`);
    pendingPlan = null;
  });

  /* ===== 星贝充值 ===== */
  const rechargeDialog = document.querySelector('#rechargeDialog');
  const rechargeConfirm = document.querySelector('#rechargeConfirm');

  document.querySelectorAll('[data-recharge]').forEach((button) => button.addEventListener('click', () => {
    pendingRecharge = { price: Number(button.dataset.recharge), starbell: Number(button.dataset.starbell) };
    document.querySelector('#rechargeDialogTitle').textContent = `确认充值 ¥${pendingRecharge.price}`;
    document.querySelector('#rechargeDialogAmount').textContent = `✦ ${wallet.format(pendingRecharge.starbell)}`;
    document.querySelector('#rechargeDialogPrice').textContent = `支付 ¥${pendingRecharge.price} · 原型环境模拟到账`;
    rechargeDialog.showModal();
  }));

  rechargeConfirm.addEventListener('click', () => {
    if (!pendingRecharge) return;
    wallet.earn(pendingRecharge.starbell);
    renderWallet(true);
    rechargeDialog.close();
    showToast(`✦ ${wallet.format(pendingRecharge.starbell)} 星贝已到账，我的空间同步可见。`);
    pendingRecharge = null;
  });

  /* ===== 商城 ===== */
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

  function renderShop() {
    document.querySelectorAll('.shop-item').forEach((button) => {
      const owned = wallet.has(button.dataset.item);
      const consumable = button.classList.contains('is-consumable');
      button.classList.toggle('is-owned', owned && !consumable);
      const itemState = button.querySelector('.item-state');
      if (owned && !consumable) itemState.textContent = button.dataset.item.startsWith('avatar-') ? '已拥有，语音页可换装' : '已拥有，去我的空间穿戴';
      else {
        const cost = Number(button.dataset.cost);
        itemState.textContent = cost === 0 ? '免费领取' : `✦ ${wallet.format(cost)}`;
      }
    });
  }

  document.querySelectorAll('.shop-item').forEach((button) => button.addEventListener('click', () => {
    const cost = Number(button.dataset.cost);
    const consumable = button.classList.contains('is-consumable');
    const owned = wallet.has(button.dataset.item);
    if (owned && !consumable) {
      showToast(`${button.dataset.name}已在你的衣橱里，去我的空间看看吧。`);
      return;
    }
    if (!wallet.spend(cost)) {
      showToast('星贝不足，可以先到上方充值档补充。');
      return;
    }
    if (!consumable) {
      wallet.own(button.dataset.item);
      if (avatarItemMap[button.dataset.item]) {
        try { localStorage.setItem(window.NEUROMATE_AVATAR_KEY || 'neuromate-avatar-mode-v16', avatarItemMap[button.dataset.item]); } catch (error) { /* ignore */ }
      }
      showToast(button.dataset.item.startsWith('avatar-')
        ? (avatarItemMap[button.dataset.item] ? `已获得${button.dataset.name}，已同步到数字人陪伴页。` : `已获得${button.dataset.name}，去语音谈心页点「换装」即可使用。`)
        : `已获得${button.dataset.name}，已同步到我的空间收藏架。`);
    } else {
      showToast(`${button.dataset.name}已送出，这份心意会变成一段陪伴记忆。`);
    }
    renderWallet(true);
    renderShop();
  }));

  /* ===== 考试技能包 ===== */
  const packDialog = document.querySelector('#packDialog');
  const packConfirm = document.querySelector('#packConfirm');

  function renderPacks() {
    document.querySelectorAll('[data-pack]').forEach((button) => {
      const unlocked = state.packs.includes(button.dataset.pack);
      button.classList.toggle('is-unlocked', unlocked);
      button.querySelector('i').textContent = unlocked ? '查看内容 →' : '查看内容 →';
    });
  }

  document.querySelectorAll('[data-pack]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.pack;
    const cost = Number(button.dataset.cost);
    const meta = packMeta[key];
    pendingPack = { key, cost };
    document.querySelector('#packDialogTitle').textContent = meta.title;
    document.querySelector('#packDialogPrice').textContent = `✦ ${wallet.format(cost)}`;
    const detail = document.querySelector('#packDialogDetail');
    detail.replaceChildren();
    meta.detail.forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      detail.appendChild(item);
    });
    const unlocked = state.packs.includes(key);
    packConfirm.disabled = unlocked;
    packConfirm.textContent = unlocked ? '已解锁，永久可用' : '解锁技能包';
    packDialog.showModal();
  }));

  packConfirm.addEventListener('click', () => {
    if (!pendingPack) return;
    if (!wallet.spend(pendingPack.cost)) {
      packDialog.close();
      showToast('星贝不足，可以先到上方充值档补充。');
      return;
    }
    state.packs.push(pendingPack.key);
    saveState();
    renderWallet(true);
    renderPacks();
    packDialog.close();
    showToast(`${packMeta[pendingPack.key].title}已解锁，随时可以开始使用。`);
    pendingPack = null;
  });

  /* ===== 校园大使 ===== */
  const inviteButton = document.querySelector('#inviteButton');
  const ambassadorFill = document.querySelector('#ambassadorFill');
  const ambassadorHint = document.querySelector('#ambassadorHint');

  function renderAmbassador() {
    ambassadorFill.style.width = `${Math.min(state.invites, 10) * 10}%`;
    ambassadorHint.textContent = state.invites >= 10
      ? '已完成 10 位邀请，限定装扮与抽卡机会已发放'
      : `已邀请 ${state.invites} / 10 位同学`;
    inviteButton.disabled = state.invites >= 10;
    inviteButton.textContent = state.invites >= 10 ? '奖励已全部领取' : '模拟邀请一位同学';
  }

  inviteButton.addEventListener('click', () => {
    if (state.invites >= 10) return;
    state.invites += 1;
    saveState();
    renderAmbassador();
    if (state.invites === 3) showToast('达成 3 人邀请：月度 SVIP 已加入你的账户（原型演示）。');
    else if (state.invites === 10) {
      ws.tickets += 10;
      wallet.save();
      showToast('达成 10 人邀请：限定装扮与 10 次免费抽取已发放，到我的空间即可使用。');
    }
    else showToast(`已记录第 ${state.invites} 位邀请，继续加油。`);
  });

  /* ===== 完整功能对比表 ===== */
  const compareToggle = document.querySelector('#compareToggle');
  const compareTable = document.querySelector('#planCompareTable');
  if (compareToggle && compareTable) {
    compareToggle.addEventListener('click', () => {
      const open = !compareTable.classList.contains('is-open');
      compareTable.classList.toggle('is-open', open);
      compareToggle.classList.toggle('is-open', open);
      compareToggle.setAttribute('aria-expanded', String(open));
      compareToggle.querySelector('span').textContent = open ? '收起功能对比' : '查看完整功能对比';
    });
  }

  /* ===== 情绪报告（单次内购，明码标价） ===== */
  const reportMeta = {
    monthly: { name: '深度月报', cost: 1200 },
    semester: { name: '学期报告', cost: 6000 }
  };
  const ownedReports = new Set((() => {
    try { return JSON.parse(localStorage.getItem('neuromate-reports-v1')) || []; } catch (error) { return []; }
  })());

  function saveReports() {
    try { localStorage.setItem('neuromate-reports-v1', JSON.stringify([...ownedReports])); } catch (error) { /* 原型环境允许无存储运行。 */ }
  }

  document.querySelectorAll('[data-report]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.report;
    const meta = reportMeta[key];
    if (ownedReports.has(key)) {
      showToast(`${meta.name}已解锁，可以在成长中心查看。`);
      return;
    }
    if (!wallet.spend(meta.cost)) {
      showToast('星贝不足，可以先到上方充值档补充。');
      return;
    }
    ownedReports.add(key);
    saveReports();
    renderWallet(true);
    button.textContent = '已解锁';
    button.disabled = true;
    showToast(`${meta.name}已解锁，可以在成长中心查看。`);
  }));

  /* ===== 复制邀请码 ===== */
  const inviteCopy = document.querySelector('#inviteCopy');
  if (inviteCopy) {
    inviteCopy.addEventListener('click', () => {
      const codeInput = document.querySelector('#inviteCode');
      codeInput.select();
      codeInput.setSelectionRange(0, 9999);
      try {
        navigator.clipboard.writeText(codeInput.value).then(
          () => showToast(`邀请码 ${codeInput.value} 已复制，分享给同学吧。`),
          () => showToast(`邀请码 ${codeInput.value}，复制成功。`)
        );
      } catch (error) {
        showToast(`邀请码 ${codeInput.value}，已为你选中。`);
      }
    });
  }

  /* ===== 合规承诺手风琴 ===== */
  document.querySelectorAll('.promise-list article > button').forEach((button) => button.addEventListener('click', () => {
    const article = button.closest('article');
    const open = !article.classList.contains('is-open');
    document.querySelectorAll('.promise-list article').forEach((item) => {
      item.classList.remove('is-open');
      item.querySelector('button').setAttribute('aria-expanded', 'false');
      item.querySelector('button i').textContent = '+';
    });
    if (open) {
      article.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      button.querySelector('i').textContent = '−';
    }
  }));

  renderWallet(false);
  renderBilling();
  renderPlans();
  renderShop();
  renderPacks();
  renderAmbassador();
  document.querySelectorAll('[data-report]').forEach((button) => {
    if (ownedReports.has(button.dataset.report)) {
      button.textContent = '已解锁';
      button.disabled = true;
    }
  });
})();
