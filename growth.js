(function () {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) document.body.dataset.reducedMotion = 'true';

  document.querySelectorAll('[data-count]').forEach((element) => {
    const target = Number(element.dataset.count);
    const start = performance.now();
    function tick(now) {
      const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 1100);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  });

  const rhythm = document.querySelector('#rhythmBars');
  [36, 58, 72, 64, 48, 77, 68, 42].forEach((value, index) => {
    const item = document.createElement('span');
    const bar = document.createElement('i');
    const label = document.createElement('small');
    bar.style.height = `${value}%`;
    bar.style.animationDelay = `${index * 70}ms`;
    label.textContent = `${7 + index * 2}:00`;
    item.append(bar, label);
    rhythm.appendChild(item);
  });

  const trend = document.querySelector('#growthTrendCanvas');
  const trendContext = trend.getContext('2d');
  let range = 7;
  let chartProgress = reducedMotion ? 1 : 0;
  function makeSeries(length) {
    return Array.from({ length }, (_, index) => {
      const energy = 53 + Math.sin(index * .72) * 10 + index / length * 11 + Math.sin(index * 1.9) * 3;
      const tension = 66 - Math.sin(index * .68) * 9 - index / length * 10 + Math.cos(index * 1.5) * 4;
      return { energy: Math.round(energy), tension: Math.round(tension) };
    });
  }
  function drawTrend() {
    const rect = trend.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    trend.width = Math.max(1, Math.round(rect.width * ratio));
    trend.height = Math.max(1, Math.round(rect.height * ratio));
    trendContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const width = rect.width;
    const height = rect.height;
    const pad = { l: 34, r: 18, t: 24, b: 32 };
    const series = makeSeries(range);
    trendContext.clearRect(0, 0, width, height);
    trendContext.strokeStyle = 'rgba(23,37,50,.1)';
    trendContext.fillStyle = '#71808b';
    trendContext.font = '10px sans-serif';
    trendContext.textAlign = 'right';
    [25,50,75,100].forEach((value) => {
      const y = height - pad.b - value / 100 * (height - pad.t - pad.b);
      trendContext.beginPath(); trendContext.moveTo(pad.l, y); trendContext.lineTo(width - pad.r, y); trendContext.stroke();
      trendContext.fillText(String(value), pad.l - 8, y + 3);
    });
    const count = Math.max(2, Math.ceil(series.length * chartProgress));
    function pointsFor(key) {
      return series.slice(0, count).map((item, index) => ({
        x: pad.l + (width - pad.l - pad.r) * index / (series.length - 1),
        y: height - pad.b - item[key] / 100 * (height - pad.t - pad.b)
      }));
    }
    function line(points, color, fill) {
      if (fill) {
        const gradient = trendContext.createLinearGradient(0, pad.t, 0, height - pad.b);
        gradient.addColorStop(0, 'rgba(196,127,76,.22)'); gradient.addColorStop(1, 'rgba(196,127,76,0)');
        trendContext.beginPath(); points.forEach((point,index) => index ? trendContext.lineTo(point.x,point.y) : trendContext.moveTo(point.x,point.y));
        trendContext.lineTo(points[points.length - 1].x, height - pad.b); trendContext.lineTo(points[0].x, height - pad.b); trendContext.closePath(); trendContext.fillStyle = gradient; trendContext.fill();
      }
      trendContext.beginPath(); points.forEach((point,index) => index ? trendContext.lineTo(point.x,point.y) : trendContext.moveTo(point.x,point.y));
      trendContext.strokeStyle = color; trendContext.lineWidth = 2.5; trendContext.stroke();
    }
    line(pointsFor('energy'), '#c47f4c', true);
    line(pointsFor('tension'), '#5f8fb3', false);
    trendContext.textAlign = 'center';
    const labelStep = range <= 7 ? 1 : range <= 14 ? 2 : 5;
    for (let index = 0; index < range; index += labelStep) {
      const x = pad.l + (width - pad.l - pad.r) * index / (range - 1);
      trendContext.fillStyle = '#71808b'; trendContext.fillText(range === 7 ? ['一','二','三','四','五','六','今'][index] : `${index + 1}`, x, height - 8);
    }
  }
  function animateChart() {
    chartProgress = Math.min(1, chartProgress + .028);
    drawTrend();
    if (chartProgress < 1) window.requestAnimationFrame(animateChart);
  }
  animateChart();
  document.querySelectorAll('[data-range]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('[data-range].active').classList.remove('active');
    button.classList.add('active');
    range = Number(button.dataset.range);
    chartProgress = reducedMotion ? 1 : 0;
    document.querySelector('#rangeDelta').textContent = range === 7 ? '+12%' : range === 14 ? '+8%' : '+17%';
    animateChart();
  }));

  const radar = document.querySelector('#balanceCanvas');
  const radarContext = radar.getContext('2d');
  function drawRadar() {
    const rect = radar.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    radar.width = Math.round(rect.width * ratio); radar.height = Math.round(rect.height * ratio);
    radarContext.setTransform(ratio,0,0,ratio,0,0);
    const cx = rect.width / 2; const cy = rect.height / 2 + 5; const radius = Math.min(rect.width,rect.height) * .36;
    radarContext.clearRect(0,0,rect.width,rect.height);
    const labels = ['睡眠','能量','专注','松弛','连接'];
    const values = [.58,.63,.72,.44,.81];
    for (let ring = 1; ring <= 4; ring += 1) {
      radarContext.beginPath();
      labels.forEach((_,index) => { const angle = -Math.PI/2 + index * Math.PI*2/labels.length; const x = cx + Math.cos(angle)*radius*ring/4; const y = cy + Math.sin(angle)*radius*ring/4; index ? radarContext.lineTo(x,y) : radarContext.moveTo(x,y); });
      radarContext.closePath(); radarContext.strokeStyle = 'rgba(23,37,50,.1)'; radarContext.stroke();
    }
    radarContext.beginPath();
    labels.forEach((label,index) => {
      const angle = -Math.PI/2 + index * Math.PI*2/labels.length;
      const x = cx + Math.cos(angle)*radius*values[index]; const y = cy + Math.sin(angle)*radius*values[index];
      index ? radarContext.lineTo(x,y) : radarContext.moveTo(x,y);
      radarContext.fillStyle = '#71808b'; radarContext.font = '9px sans-serif'; radarContext.textAlign = Math.cos(angle) > .2 ? 'left' : Math.cos(angle) < -.2 ? 'right' : 'center';
      radarContext.fillText(label,cx + Math.cos(angle)*(radius+18),cy + Math.sin(angle)*(radius+18));
    });
    radarContext.closePath(); radarContext.fillStyle = 'rgba(95,143,179,.2)'; radarContext.fill(); radarContext.strokeStyle = '#5f8fb3'; radarContext.lineWidth = 2; radarContext.stroke();
  }
  drawRadar();

  const calendarGrid = document.querySelector('#calendarGrid');
  const monthTitle = document.querySelector('#monthTitle');
  const calendarInsightTitle = document.querySelector('#calendarInsightTitle');
  const calendarInsightText = document.querySelector('#calendarInsightText');
  const monthPrev = document.querySelector('#monthPrev');
  const monthNext = document.querySelector('#monthNext');
  const monthInsights = [
    ['假期节律仍在调整', '1 月前半段入睡时间偏晚；恢复晨间记录后，白天的能量起伏逐渐变小。'],
    ['休息带来了更多余量', '2 月的紧绷感整体较低；与朋友见面的几天，情绪能量最为稳定。'],
    ['开学后的适应很平稳', '3 月第二周任务增多，但拆分计划后，专注时段正在慢慢变长。'],
    ['任务密集时更需要停顿', '4 月中旬连续学习时间较长；加入短暂停顿后，晚间疲惫感有所下降。'],
    ['考前紧绷感开始上升', '5 月下旬的能量波动更明显；规律睡眠的几天，第二天恢复得更快。'],
    ['期末周后的节律正在回稳', '6 月考试周紧绷感达到高点；完成考试后，睡眠和情绪能量都在缓慢恢复。'],
    ['考试周前后波动明显', '7 月 14 日到 18 日紧绷感上升；呼吸练习后的两个晚上，入睡前能量更稳定。'],
    ['假期里也保留了照顾自己', '8 月记录频率放缓，但户外活动后的几天，能量余量明显更高。'],
    ['返校适应带来短暂波动', '9 月第一周紧绷感上升；重新建立作息后，晚间状态逐步稳定。'],
    ['学习节奏正在形成', '10 月的专注时间较为稳定；及时结束过长任务，有助于保留晚间能量。'],
    ['阶段任务让压力有所增加', '11 月中旬低能量天数增多；向同伴求助后，连续紧绷的时段缩短。'],
    ['年末回看带来了确定感', '12 月虽然任务较多，但记录更连续，也更容易发现适合自己的恢复方式。']
  ];
  let displayMonth = 6;
  function renderCalendar() {
    calendarGrid.replaceChildren();
    const year = 2026;
    const days = new Date(year, displayMonth + 1, 0).getDate();
    const first = (new Date(year, displayMonth, 1).getDay() + 6) % 7;
    monthTitle.textContent = `${year} 年 ${displayMonth + 1} 月`;
    [calendarInsightTitle.textContent, calendarInsightText.textContent] = monthInsights[displayMonth];
    monthPrev.disabled = displayMonth === 0;
    monthNext.disabled = displayMonth === 11;
    for (let index = 0; index < first; index += 1) {
      const empty = document.createElement('button'); empty.className = 'empty'; empty.disabled = true; calendarGrid.appendChild(empty);
    }
    for (let day = 1; day <= days; day += 1) {
      const button = document.createElement('button');
      const level = (Math.abs(Math.sin((day + displayMonth * 3) * 2.17)) * 5) | 0;
      button.className = level ? `level-${Math.min(4,level)}` : 'blank';
      button.textContent = String(day);
      button.title = level ? `${displayMonth + 1} 月 ${day} 日：已记录` : `${displayMonth + 1} 月 ${day} 日：未记录`;
      button.addEventListener('click', () => {
        showToast(level ? `${displayMonth + 1} 月 ${day} 日留下了记录，继续照顾自己。` : '这一天没有记录，留白也算数。');
      });
      calendarGrid.appendChild(button);
    }
  }
  monthPrev.addEventListener('click', () => { displayMonth = Math.max(0, displayMonth - 1); renderCalendar(); });
  monthNext.addEventListener('click', () => { displayMonth = Math.min(11, displayMonth + 1); renderCalendar(); });
  renderCalendar();

  const fortunes = [
    ['循光','不必一次照亮整条路，先让下一步变得清楚。','从熟悉的内容开始，稳定感会慢慢回来。'],
    ['留白','今天没有完成的部分，也不等于你做得不够。','给计划留一点空位，身体才有余量继续。'],
    ['缓流','慢一点不是退后，是让力量重新聚拢。','把任务缩小到十分钟，完成后允许自己停下。'],
    ['回声','你愿意说出来的那一刻，孤单已经少了一点。','找一个可信任的人，分享一句最真实的感受。'],
    ['微光','此刻能看见的一小步，已经足够。','先完成最熟悉的一题，让可控感回来。']
  ];
  let fortuneIndex = 0;
  document.querySelector('#drawFortune').addEventListener('click', () => {
    const card = document.querySelector('#fortuneCard');
    card.classList.add('drawing');
    window.setTimeout(() => {
      fortuneIndex = (fortuneIndex + 1) % fortunes.length;
      document.querySelector('#fortuneTitle').textContent = fortunes[fortuneIndex][0];
      document.querySelector('#fortuneText').textContent = fortunes[fortuneIndex][1];
      document.querySelector('#fortuneMeaning').textContent = fortunes[fortuneIndex][2];
      card.classList.remove('drawing');
    }, reducedMotion ? 0 : 360);
  });

  const toast = document.querySelector('#toast');
  let toastTimer;
  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2300);
  }
  document.querySelectorAll('[data-badge]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.badge)));
  window.addEventListener('resize', () => { drawTrend(); drawRadar(); });
})();
