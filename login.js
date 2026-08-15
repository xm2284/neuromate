(function () {
  'use strict';

  const canvas = document.querySelector('#waterCurtain');
  const ctx = canvas.getContext('2d');
  const audioToggle = document.querySelector('#audioToggle');
  const audio = document.querySelector('#calmAudio');
  const toast = document.querySelector('#toast');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: -500, y: -500, px: -500, py: -500, vx: 0, vy: 0, speed: 0, down: false, active: false };

  let toastTimer;
  let audioFadeFrame;
  let ratio = 1;
  let width = 0;
  let height = 0;
  let lines = [];
  let fallingDrops = [];
  let animationFrame;

  const curtain = {
    lineCount: 22,
    span: 820,
    segment: 10,
    gravity: .1,
    repulsion: 110,
    constraints: 8,
    damping: .995,
    detachChance: .18
  };

  // ============ 琴弦水帘音效（V1.3 交互发声 · 共存降音版） ============
  // 保留 V1.2 原版背景乐（音量 0.42），琴弦音色作为水帘交互的叠加层：
  // fxGain 压低至 0.13，保证不盖过背景乐；首次指针交互时才初始化 AudioContext。
  // 五声音阶按指针 x 坐标映射、y 坐标做微调，滑弦加低通滤波，水珠用带通音。
  class AudioSynth {
    constructor() {
      this.ctx = null;
      this.fxGain = null;
      this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
      this.reverb = null;
      this.delay = null;
      this.lastNoteTime = 0;
    }

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.fxGain = this.ctx.createGain();
      this.fxGain.gain.value = 0.13;
      this.reverb = this.createReverb();
      this.delay = this.ctx.createDelay();
      this.delay.delayTime.value = 0.4;
      const delayGain = this.ctx.createGain();
      delayGain.gain.value = 0.2;
      this.fxGain.connect(this.delay);
      this.fxGain.connect(this.reverb);
      this.reverb.connect(this.ctx.destination);
      this.delay.connect(delayGain);
      delayGain.connect(this.delay);
      delayGain.connect(this.ctx.destination);
    }

    createReverb() {
      const convolver = this.ctx.createConvolver();
      const rate = this.ctx.sampleRate;
      const length = rate * 3;
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let c = 0; c < 2; c += 1) {
        const ch = impulse.getChannelData(c);
        for (let i = 0; i < length; i += 1) {
          ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        }
      }
      convolver.buffer = impulse;
      return convolver;
    }

    playWaterNote(intensity, x, y) {
      if (!this.ctx) this.init();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      if (now - this.lastNoteTime < 0.06) return;
      this.lastNoteTime = now;
      const scaleIndex = Math.floor((x / Math.max(1, width)) * this.scale.length) % this.scale.length;
      const freq = this.scale[scaleIndex];
      const detune = ((y / Math.max(1, height)) - 0.5) * 80;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      filter.type = 'lowpass';
      filter.frequency.value = 600 + intensity * 1800;
      filter.Q.value = 2;
      const vol = Math.min(0.22, 0.04 + intensity * 0.10);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0 + intensity * 0.6);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.fxGain);
      osc.start(now);
      osc.stop(now + 2.5);
    }

    playDropNote(x, y) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const scaleIndex = Math.floor((x / Math.max(1, width)) * this.scale.length) % this.scale.length;
      const freq = this.scale[scaleIndex] * (1 + Math.floor(Math.random() * 2));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 3;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.10, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.fxGain);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }

  const synth = new AudioSynth();

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function seeded(index, salt) {
    const value = Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function makePoint(x, y, pinned) {
    return { x, y, oldX: x, oldY: y, pinned, anchorX: x, anchorY: y };
  }

  function makeDrop(lineIndex, pointIndex, salt, small) {
    const sizeSeed = seeded(lineIndex + salt, pointIndex + salt * 3);
    const colorSeed = seeded(pointIndex + salt, lineIndex + 17);
    return {
      pointIndex,
      size: small ? 2.2 + sizeSeed * 2.2 : 4.2 + sizeSeed * 7,
      color: colorSeed > .94 ? '#d96f5d' : colorSeed > .76 ? '#244b8c' : colorSeed > .48 ? '#789db5' : '#e8f7fc',
      alpha: .42 + sizeSeed * .3,
      attached: true
    };
  }

  function buildCurtain() {
    const mobile = width < 620;
    const lineCount = mobile ? 13 : curtain.lineCount;
    const span = mobile ? width + 22 : Math.min(width, curtain.span);
    const margin = (width - span) / 2;
    const spacing = span / Math.max(1, lineCount - 1);
    const segment = mobile ? 11 : curtain.segment;
    lines = [];
    fallingDrops = [];

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const baseX = margin + lineIndex * spacing;
      const points = [];
      for (let y = -12, pointIndex = 0; y <= height + 26; y += segment, pointIndex += 1) {
        points.push(makePoint(baseX, y, pointIndex === 0));
      }

      const drops = [];
      const dropCount = 5 + Math.floor(seeded(lineIndex, 5) * 4);
      for (let dropIndex = 0; dropIndex < dropCount; dropIndex += 1) {
        const progress = (dropIndex + 1) / (dropCount + 1);
        const jitter = Math.round((seeded(lineIndex, dropIndex + 30) - .5) * 8);
        const pointIndex = Math.max(3, Math.min(points.length - 2, Math.round(progress * (points.length - 1)) + jitter));
        drops.push(makeDrop(lineIndex, pointIndex, dropIndex, false));
      }
      for (let smallIndex = 0; smallIndex < 1; smallIndex += 1) {
        const pointIndex = 4 + Math.floor(seeded(lineIndex, smallIndex + 80) * Math.max(1, points.length - 7));
        drops.push(makeDrop(lineIndex, pointIndex, smallIndex + 20, true));
      }
      lines.push({ baseX, points, drops, segment });
    }
  }

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 1.8);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildCurtain();
    draw();
  }

  function updatePointer(event) {
    const nextX = event.clientX;
    const nextY = event.clientY;
    pointer.px = pointer.active ? pointer.x : nextX;
    pointer.py = pointer.active ? pointer.y : nextY;
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.vx = pointer.x - pointer.px;
    pointer.vy = pointer.y - pointer.py;
    pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    pointer.active = true;
    if (!audio.paused && pointer.speed > 1.2) {
      synth.playWaterNote(Math.min(1, pointer.speed / 12), pointer.x, pointer.y);
    }
  }

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', (event) => {
    pointer.down = true;
    canvas.setPointerCapture(event.pointerId);
    updatePointer(event);
  });
  canvas.addEventListener('pointerup', () => { pointer.down = false; });
  canvas.addEventListener('pointercancel', () => { pointer.down = false; pointer.active = false; });
  canvas.addEventListener('pointerleave', () => { pointer.down = false; pointer.active = false; });

  function simulatePoint(point) {
    if (point.pinned) {
      point.x = point.anchorX;
      point.y = point.anchorY;
      point.oldX = point.anchorX;
      point.oldY = point.anchorY;
      return;
    }

    let velocityX = (point.x - point.oldX) * curtain.damping;
    let velocityY = (point.y - point.oldY) * curtain.damping;
    velocityX = Math.max(-15, Math.min(15, velocityX));
    velocityY = Math.max(-15, Math.min(15, velocityY));
    point.oldX = point.x;
    point.oldY = point.y;
    point.x += velocityX;
    point.y += velocityY + curtain.gravity;

    if (!pointer.active) return;
    const dx = point.x - pointer.x;
    const dy = point.y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= curtain.repulsion || distance < .001) return;
    const falloff = 1 - distance / curtain.repulsion;
    const strength = falloff * (pointer.down ? 1.75 : 1.1);
    point.x += dx / distance * strength + pointer.vx * .035;
    point.y += dy / distance * strength + pointer.vy * .02;
  }

  function constrain(line) {
    for (let pass = 0; pass < curtain.constraints; pass += 1) {
      for (let index = 0; index < line.points.length - 1; index += 1) {
        const first = line.points[index];
        const second = line.points[index + 1];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.max(.001, Math.hypot(dx, dy));
        const offset = (line.segment - distance) / distance / 5;
        const offsetX = dx * offset;
        const offsetY = dy * offset;
        if (!first.pinned) {
          first.x -= offsetX;
          first.y -= offsetY;
        }
        if (!second.pinned) {
          second.x += offsetX;
          second.y += offsetY;
        }
      }
      const anchor = line.points[0];
      anchor.x = line.baseX;
      anchor.y = -12;
    }
  }

  function detachDrops(line) {
    if (!pointer.active || (!pointer.down && pointer.speed < 1.2)) return;
    let detached = 0;
    for (const drop of line.drops) {
      if (!drop.attached || detached >= 3) continue;
      const point = line.points[drop.pointIndex];
      const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
      const beadSpeed = Math.hypot(point.x - point.oldX, point.y - point.oldY);
      if (distance > curtain.repulsion * 1.25 || (!pointer.down && beadSpeed < 1.4)) continue;
      if (Math.random() > curtain.detachChance) continue;
      fallingDrops.push({
        x: point.x,
        y: point.y,
        vx: (point.x - point.oldX) * .65 + pointer.vx * .12 + (Math.random() - .5) * 2.4,
        vy: (point.y - point.oldY) * .65 + 1.2 + Math.random() * 2.8,
        size: drop.size,
        color: drop.color,
        alpha: drop.alpha
      });
      drop.attached = false;
      detached += 1;
      if (!audio.paused) synth.playDropNote(point.x, point.y);
    }
  }

  function update() {
    for (const line of lines) {
      line.points.forEach(simulatePoint);
      constrain(line);
      detachDrops(line);
    }
    for (const drop of fallingDrops) {
      drop.vy += .45;
      drop.vx *= .992;
      drop.vy *= .992;
      drop.x += drop.vx;
      drop.y += drop.vy;
    }
    fallingDrops = fallingDrops.filter((drop) => drop.y < height + 100 && drop.x > -120 && drop.x < width + 120);
    pointer.speed *= .78;
    pointer.vx *= .78;
    pointer.vy *= .78;
  }

  function drawDrop(x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.45);
    ctx.bezierCurveTo(size * .76, -size * .35, size, size * .46, 0, size * 1.15);
    ctx.bezierCurveTo(-size, size * .46, -size * .76, -size * .35, 0, -size * 1.45);
    ctx.fill();
    ctx.restore();
  }

  function drawLine(points) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length - 1; index += 1) {
      const point = points[index];
      const next = points[index + 1];
      ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.05;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(224,240,250,.68)';
    for (const line of lines) {
      drawLine(line.points);
      for (const drop of line.drops) {
        if (!drop.attached) continue;
        const point = line.points[drop.pointIndex];
        drawDrop(point.x, point.y, drop.size, drop.color, drop.alpha);
      }
    }
    for (const drop of fallingDrops) drawDrop(drop.x, drop.y, drop.size, drop.color, drop.alpha);
  }

  function animate() {
    if (!reduceMotion) update();
    draw();
    animationFrame = window.requestAnimationFrame(animate);
  }

  function setAudioState(playing) {
    audioToggle.setAttribute('aria-pressed', String(playing));
    audioToggle.title = playing ? '暂停原版背景音乐' : '播放原版背景音乐';
    audioToggle.setAttribute('aria-label', audioToggle.title);
  }

  function fadeAudio(target, duration, onComplete) {
    window.cancelAnimationFrame(audioFadeFrame);
    const startVolume = audio.volume;
    const startedAt = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - Math.max(0, progress), 3);
      audio.volume = Math.min(1, Math.max(0, startVolume + (target - startVolume) * eased));
      if (progress < 1) audioFadeFrame = window.requestAnimationFrame(step);
      else if (onComplete) onComplete();
    }
    audioFadeFrame = window.requestAnimationFrame(step);
  }

  function disarmAudioUnlock() {
    document.removeEventListener('pointerdown', unlockAudio, true);
    document.removeEventListener('keydown', unlockAudio, true);
  }

  function armAudioUnlock() {
    document.addEventListener('pointerdown', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);
  }

  async function startAudio() {
    try {
      audio.volume = 0;
      audio.muted = true;
      await audio.play();
      audio.muted = false;
      disarmAudioUnlock();
      setAudioState(true);
      fadeAudio(.42, 6500);
      return true;
    } catch (error) {
      setAudioState(false);
      armAudioUnlock();
      return false;
    }
  }

  function unlockAudio(event) {
    if (audioToggle.contains(event.target)) return;
    startAudio();
  }

  audioToggle.addEventListener('click', async () => {
    if (audio.paused) {
      const started = await startAudio();
      if (!started) showToast('浏览器暂时阻止了音乐播放，请再点一次。');
      return;
    }
    fadeAudio(0, 500, () => {
      audio.pause();
      audio.volume = .42;
      setAudioState(false);
    });
  });

  audio.volume = 0;
  const initialAudio = startAudio();
  if (new URLSearchParams(window.location.search).get('music') === '1') {
    initialAudio.then((started) => {
      showToast(started ? '深海音乐已开启，欢迎回来。' : '浏览器需要一次互动才能播放音乐，点击右下角音符即可开启。');
    });
  }

  const password = document.querySelector('#password');
  const passwordToggle = document.querySelector('#passwordToggle');
  passwordToggle.addEventListener('click', () => {
    const visible = password.type === 'text';
    password.type = visible ? 'password' : 'text';
    passwordToggle.textContent = visible ? '显示' : '隐藏';
    passwordToggle.setAttribute('aria-pressed', String(!visible));
  });

  const moodHint = document.querySelector('#moodHint');
  const moodCopy = {
    quiet: '登录后会优先进入低打扰陪伴模式。',
    stress: '登录后会先推荐一分钟呼吸和焦虑拆解。',
    talk: '登录后会优先打开数字人倾听对话。'
  };
  document.querySelectorAll('[data-mood]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('.mood-options .active')?.classList.remove('active');
      button.classList.add('active');
      moodHint.textContent = moodCopy[button.dataset.mood];
    });
  });

  const form = document.querySelector('#loginForm');
  const account = document.querySelector('#account');
  const message = document.querySelector('#formMessage');
  function saveLoginProfile(kind) {
    const value = (account.value || '').trim();
    const profile = kind === 'guest'
      ? { name: '游客', account: 'guest', initial: 'G', mode: 'guest' }
      : { name: value, account: value, initial: value.slice(0, 1).toUpperCase() || 'Z', mode: 'account' };
    try { localStorage.setItem('neuromate-login-user', JSON.stringify(profile)); } catch (error) { /* ignore */ }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!account.value.trim()) {
      message.textContent = '请先输入学号或手机号。';
      account.focus();
      return;
    }
    if (password.value.length < 4) {
      message.textContent = '密码至少需要 4 位。';
      password.focus();
      return;
    }
    message.textContent = '';
    saveLoginProfile('account');
    window.location.href = 'space.html';
  });
  document.querySelector('#guestButton').addEventListener('click', () => {
    saveLoginProfile('guest');
    window.location.href = 'space.html';
  });
  document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.toast)));

  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(animationFrame);
    window.cancelAnimationFrame(audioFadeFrame);
  });
  resize();
  if (!reduceMotion) animate();
})();
