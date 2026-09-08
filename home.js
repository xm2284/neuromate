(function () {
  'use strict';

  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) body.dataset.reducedMotion = 'true';

  const toast = document.querySelector('#toast');
  let toastTimer;
  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
  }

  const heroVideo = document.querySelector('#heroVideo');
  const heroVideoControl = document.querySelector('#heroVideoControl');
  function syncHeroVideoControl() {
    if (!heroVideo || !heroVideoControl) return;
    const playing = !heroVideo.paused && !heroVideo.ended;
    heroVideoControl.textContent = playing ? '暂停背景' : '播放背景';
    heroVideoControl.setAttribute('aria-pressed', String(playing));
  }
  if (heroVideo && heroVideoControl) {
    heroVideoControl.addEventListener('click', async () => {
      if (heroVideo.paused) {
        try {
          await heroVideo.play();
        } catch (error) {
          showToast('浏览器暂时没有允许播放背景视频。');
        }
      } else {
        heroVideo.pause();
      }
      syncHeroVideoControl();
    });
    heroVideo.addEventListener('play', syncHeroVideoControl);
    heroVideo.addEventListener('pause', syncHeroVideoControl);
    syncHeroVideoControl();
  }

  document.querySelectorAll('.reveal').forEach((element) => {
    if (reducedMotion) {
      element.classList.add('visible');
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    observer.observe(element);
  });

  const companionLine = document.querySelector('#homeCompanionLine');
  const conversation = document.querySelector('#homeConversation');
  const quickReplies = {
    listen: '好。我们先不分析，也不赶着得出结论。你可以慢慢说，我会跟着你的节奏。',
    sort: '我们把它分成三格：已经发生的事实、脑海里的担心、此刻能做的一小步。',
    action: '今晚只做十分钟：先打开最熟悉的一页，圈出三个已经会的知识点。做到这里就可以停。'
  };
  document.querySelectorAll('[data-reply]').forEach((button) => {
    button.addEventListener('click', () => {
      const text = quickReplies[button.dataset.reply];
      const bubble = document.createElement('p');
      bubble.className = 'message message--ai';
      bubble.textContent = '元元正在整理...';
      conversation.appendChild(bubble);
      companionLine.textContent = '我在听，也在帮你把问题放轻一点。';
      window.setTimeout(() => {
        bubble.textContent = text;
        bubble.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
      }, reducedMotion ? 0 : 520);
    });
  });

  const dialog = document.querySelector('#homeDialog');
  const dialogKicker = document.querySelector('#dialogKicker');
  const dialogTitle = document.querySelector('#dialogTitle');
  const dialogCopy = document.querySelector('#dialogCopy');
  const dialogAction = document.querySelector('#dialogAction');
  const breath = document.querySelector('#homeBreath');
  let tool = '';
  let breathing = false;
  let breathTimers = [];

  const toolCopy = {
    breath: ['一分钟呼吸', '让身体先慢一点。', '准备好时再开始，随时可以停下。', '开始'],
    ground: ['五感落地', '把注意力带回此刻。', '看见 5 样东西，触碰 4 种质感，听见 3 个声音。无需做得标准。', '下一步'],
    journal: ['焦虑拆解', '先分开事实与猜测。', '事实：已经发生了什么？担心：大脑预测了什么？行动：现在能做哪一小步？', '记住了']
  };

  function clearBreath() {
    breathTimers.forEach(window.clearTimeout);
    breathTimers = [];
    breath.classList.remove('inhale', 'exhale');
  }
  function runBreath() {
    if (!breathing) return;
    clearBreath();
    breath.querySelector('span').textContent = '慢慢吸气';
    breath.classList.add('inhale');
    breathTimers.push(window.setTimeout(() => {
      breath.querySelector('span').textContent = '停留一下';
    }, 4000));
    breathTimers.push(window.setTimeout(() => {
      breath.classList.remove('inhale');
      breath.classList.add('exhale');
      breath.querySelector('span').textContent = '缓缓呼气';
    }, 6000));
    breathTimers.push(window.setTimeout(runBreath, 12000));
  }

  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      tool = button.dataset.tool;
      if (tool === 'music') {
        window.location.href = 'login.html?music=1';
        return;
      }
      const copy = toolCopy[tool];
      dialogKicker.textContent = copy[0];
      dialogTitle.textContent = copy[1];
      dialogCopy.textContent = copy[2];
      dialogAction.textContent = copy[3];
      breath.hidden = tool !== 'breath';
      dialog.showModal();
    });
  });

  dialogAction.addEventListener('click', () => {
    if (tool !== 'breath') {
      showToast(tool === 'ground' ? '不用一次完成，先找到眼前的一种颜色。' : '事实、担心和行动已经分开放好。');
      dialog.close();
      return;
    }
    breathing = !breathing;
    dialogAction.textContent = breathing ? '暂停' : '继续';
    if (breathing) runBreath();
    else {
      clearBreath();
      breath.querySelector('span').textContent = '停在这里也可以';
    }
  });
  dialog.addEventListener('close', () => {
    breathing = false;
    clearBreath();
    breath.querySelector('span').textContent = '准备';
  });

  const chart = document.querySelector('#homeMoodChart');
  const chartValues = [42, 49, 45, 58, 53, 55, 64];
  let chartProgress = reducedMotion ? 1 : 0;
  function drawChart() {
    const rect = chart.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    chart.width = Math.max(1, Math.round(rect.width * ratio));
    chart.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = chart.getContext('2d');
    ctx.scale(ratio, ratio);
    const width = rect.width;
    const height = rect.height;
    const pad = { left: 28, right: 18, top: 20, bottom: 30 };
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(23,37,50,.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const y = pad.top + (height - pad.top - pad.bottom) * i / 3;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
    }
    const points = chartValues.map((value, index) => ({
      x: pad.left + (width - pad.left - pad.right) * index / (chartValues.length - 1),
      y: height - pad.bottom - (value - 30) / 45 * (height - pad.top - pad.bottom)
    }));
    const visible = Math.max(2, Math.ceil(points.length * chartProgress));
    const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
    gradient.addColorStop(0, 'rgba(95,143,179,.32)');
    gradient.addColorStop(1, 'rgba(95,143,179,0)');
    ctx.beginPath();
    points.slice(0, visible).forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.lineTo(points[visible - 1].x, height - pad.bottom);
    ctx.lineTo(points[0].x, height - pad.bottom);
    ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath();
    points.slice(0, visible).forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = '#5f8fb3'; ctx.lineWidth = 3; ctx.stroke();
    const labels = ['一', '二', '三', '四', '五', '六', '今'];
    ctx.fillStyle = '#71808b'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    points.forEach((point, index) => ctx.fillText(labels[index], point.x, height - 8));
  }
  function animateChart() {
    chartProgress = Math.min(1, chartProgress + .025);
    drawChart();
    if (chartProgress < 1) window.requestAnimationFrame(animateChart);
  }
  const chartObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateChart();
      chartObserver.disconnect();
    }
  }, { threshold: .35 });
  chartObserver.observe(chart);
  window.addEventListener('resize', drawChart);

  const heatmap = document.querySelector('#homeHeatmap');
  if (heatmap) {
    const detail = document.querySelector('#heatmapDetail');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthText = `${month + 1} 月`;
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const activeDay = Math.min(now.getDate(), days);
    const energyValues = Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      if ((day + month) % 9 === 0) return 0;
      return Math.round(53 + Math.sin((day + month) * .9) * 12 + Math.cos(day * .43) * 6);
    });
    const recorded = energyValues.filter(Boolean).length;
    document.querySelector('#homeHeatmapTitle').textContent = `${monthText}记录热力`;
    document.querySelector('#homeHeatmapSummary').textContent = `${recorded} / ${days}`;
    for (let slot = 0; slot < firstDay + days; slot += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      const day = slot - firstDay + 1;
      if (day < 1 || day > days) {
        cell.className = 'empty';
        cell.disabled = true;
      } else {
        const energy = energyValues[day - 1];
        const level = energy === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((energy - 30) / 12)));
        cell.className = level ? `level-${level}` : '';
        cell.textContent = day;
        cell.setAttribute('aria-label', energy ? `${monthText} ${day} 日，示例能量 ${energy}` : `${monthText} ${day} 日，未记录`);
        if (day === activeDay) {
          cell.classList.add('active');
          detail.textContent = energy ? `${monthText} ${day} 日 · 示例能量 ${energy} · ${energy >= 65 ? '状态较有余量' : energy >= 50 ? '有一点紧绷' : '更需要休息'}` : `${monthText} ${day} 日 · 当天没有记录`;
        }
        cell.addEventListener('click', () => {
          heatmap.querySelector('.active')?.classList.remove('active');
          cell.classList.add('active');
          detail.textContent = energy ? `${monthText} ${day} 日 · 示例能量 ${energy} · ${energy >= 65 ? '状态较有余量' : energy >= 50 ? '有一点紧绷' : '更需要休息'}` : `${monthText} ${day} 日 · 当天没有记录`;
        });
      }
      heatmap.appendChild(cell);
    }
  }

  document.querySelectorAll('.preview-bars button').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('.preview-bars button.active')?.classList.remove('active');
    button.classList.add('active');
    const energy = Number(button.dataset.energy);
    document.querySelector('#rhythmDetail').textContent = `${button.dataset.time} · 能量余量 ${energy}，${energy >= 75 ? '适合处理需要专注的任务。' : energy >= 50 ? '保持当前节奏即可。' : '适合降低任务密度。'}`;
  }));

  document.querySelectorAll('[data-badge]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.badge)));

  document.querySelectorAll('[data-billing]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('[data-billing].active').classList.remove('active');
    button.classList.add('active');
    const yearly = button.dataset.billing === 'year';
    document.querySelectorAll('[data-month][data-year]').forEach((price) => {
      const priceRow = price.closest('h3');
      priceRow.classList.remove('price-changing');
      void priceRow.offsetWidth;
      priceRow.classList.add('price-changing');
      price.textContent = `¥${yearly ? price.dataset.year : price.dataset.month}`;
      price.nextElementSibling.textContent = yearly ? '/ 年' : '/ 月';
    });
  }));

  document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.toast)));
  const planDialog = document.querySelector('#planDialog');
  const planDialogTitle = document.querySelector('#planDialogTitle');
  const planDialogCopy = document.querySelector('#planDialogCopy');
  const planDialogPrice = document.querySelector('#planDialogPrice');
  const planConfirm = document.querySelector('#planConfirm');
  let selectedPlan = '';
  const planCopy = {
    plus: ['进阶版 · PLUS', '完整心情手账、考试压力管理和专属装扮主题都会立即解锁。'],
    pro: ['高级版 · PRO', '包含 Plus 权益，并开放语音陪伴额度、全部考试技能包与专业支持导航。']
  };
  document.querySelectorAll('[data-plan]').forEach((button) => button.addEventListener('click', () => {
    selectedPlan = button.dataset.plan;
    const yearly = document.querySelector('[data-billing].active').dataset.billing === 'year';
    const priceElement = button.closest('article').querySelector('[data-month]');
    planDialogTitle.textContent = planCopy[selectedPlan][0];
    planDialogCopy.textContent = planCopy[selectedPlan][1];
    planDialogPrice.textContent = `¥${yearly ? priceElement.dataset.year : priceElement.dataset.month} / ${yearly ? '年' : '月'}`;
    planDialog.showModal();
  }));
  planConfirm.addEventListener('click', () => {
    showToast(`${planCopy[selectedPlan][0]}的 7 天体验流程已准备好。`);
    planDialog.close();
  });

  document.querySelectorAll('.faq-list article').forEach((item) => {
    const button = item.querySelector('button');
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-list button').forEach((other) => {
        other.setAttribute('aria-expanded', 'false');
        other.querySelector('i').textContent = '+';
        other.closest('article').classList.remove('is-open');
      });
      if (!expanded) {
        button.setAttribute('aria-expanded', 'true');
        button.querySelector('i').textContent = '−';
        item.classList.add('is-open');
      }
    });
  });
})();
