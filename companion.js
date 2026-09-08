(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) document.body.dataset.reducedMotion = 'true';
  const avatarRegistry = window.NeuroMateAvatarRegistry;
  const avatarList = avatarRegistry ? avatarRegistry.all : [];
  let currentAvatarMode = avatarRegistry ? avatarRegistry.load() : 'yuanan';
  const messages = [
    '嗨，我来陪你一起面对考试',
    '今天也要对自己温柔一点',
    '不管结果如何，你已经在努力了',
    '焦虑只是暂时的，我在这里陪你'
  ];
  const typeTarget = document.querySelector('#typewriterText');
  let messageIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  let typewriterStopped = false;
  function typewriter() {
    if (typewriterStopped) return;
    const current = messages[messageIndex];
    if (reducedMotion) {
      typeTarget.textContent = current;
      return;
    }
    characterIndex += deleting ? -1 : 1;
    typeTarget.textContent = current.slice(0, characterIndex);
    let delay = deleting ? 46 : 92;
    if (!deleting && characterIndex === current.length) { deleting = true; delay = 2300; }
    else if (deleting && characterIndex === 0) { deleting = false; messageIndex = (messageIndex + 1) % messages.length; delay = 420; }
    window.setTimeout(typewriter, delay);
  }
  typewriter();

  const particles = document.querySelector('#stageParticles');
  for (let index = 0; index < 28; index += 1) {
    const particle = document.createElement('i');
    particle.style.left = `${(index * 37.7) % 100}%`;
    particle.style.top = `${(index * 61.3) % 100}%`;
    particle.style.opacity = String(.08 + (index % 7) * .04);
    particle.style.setProperty('--duration', `${14 + index % 11}s`);
    particle.style.animationDelay = `${-(index % 9)}s`;
    particles.appendChild(particle);
  }

  document.querySelectorAll('[data-count]').forEach((element) => {
    const target = Number(element.dataset.count);
    const start = performance.now();
    function tick(now) {
      const progress = reducedMotion ? 1 : Math.min(1, (now - start) / 1200);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  });

  const paletteNames = { calm: '平静', joy: '愉悦', warm: '温暖', focus: '专注' };
  const palettePlaceholders = {
    calm: '慢慢说，不用组织得很完整……',
    joy: '把今天让你轻松一点的事告诉我吧。',
    warm: '我在，先说最需要被接住的那一句。',
    focus: '我们可以先拆一个最小步骤。'
  };
  document.querySelectorAll('[data-palette]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('[data-palette].active').classList.remove('active');
    button.classList.add('active');
    const palette = button.dataset.palette;
    // 心情用独立 data-mood 属性，避免覆盖主题的 body[data-palette="morandi"]
    document.body.dataset.mood = palette;
    document.querySelector('#paletteLabel').textContent = paletteNames[palette];
    const moodInput = document.querySelector('#companionInput');
    if (moodInput) moodInput.placeholder = palettePlaceholders[palette] || palettePlaceholders.calm;
    try {
      localStorage.setItem('neuromate-companion-render-state', JSON.stringify({ mood: palette }));
    } catch (error) { /* ignore */ }
    window.dispatchEvent(new CustomEvent('neuromate:mood-change', { detail: { mood: palette } }));
  }));

  const quotes = [
    '深呼吸，你比想象中更强大。',
    '考试只是旅程的一段，你的价值从不由分数定义。',
    '允许自己休息，也允许自己紧张。',
    '每一步都算数，每一次呼吸都是进步。'
  ];
  let quoteIndex = 0;
  document.querySelector('#dailyLine').addEventListener('click', () => {
    quoteIndex = (quoteIndex + 1) % quotes.length;
    document.querySelector('#dailyLine p').textContent = quotes[quoteIndex];
  });

  const avatar = document.querySelector('#humanAvatar');
  const avatarPreviewImage = document.querySelector('#avatarPreviewImage');
  const avatarPreviewVideo = document.querySelector('#avatarPreviewVideo');
  const avatarRenderBadge = document.querySelector('#avatarRenderBadge');
  const avatarCostumeDisplay = document.querySelector('.avatar-costume-display');
  function activeAvatar() {
    return avatar;
  }
  function currentAvatar() {
    return avatarRegistry ? avatarRegistry.get(currentAvatarMode) : { id: 'yuanan', name: '元安', render: 'static', desc: '默认数字人', type: 'PNG' };
  }
  function animateActiveAvatar(message) {
    typewriterStopped = true;
    const target = activeAvatar();
    target.classList.remove('greet');
    void target.offsetWidth;
    target.classList.add('greet');
    document.querySelector('#typewriterText').textContent = message;
    window.dispatchEvent(new CustomEvent('neuromate:speaking', { detail: { text: message } }));
  }
  avatar.addEventListener('click', () => animateActiveAvatar(`${currentAvatar().name}看到你了。要和我说说话吗？`));
  document.querySelector('#avatarStage').addEventListener('pointermove', (event) => {
    if (reducedMotion || window.innerWidth < 820) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    activeAvatar().style.transform = `translate(${x * 9}px, ${y * 7}px)`;
  });
  document.querySelector('#avatarStage').addEventListener('pointerleave', () => {
    avatar.style.transform = '';
  });

  const drawer = document.querySelector('#chatDrawer');
  const shade = document.querySelector('#drawerShade');
  const input = document.querySelector('#companionInput');
  function openChat() {
    typewriterStopped = true;
    drawer.classList.add('open');
    shade.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => input.focus(), 250);
  }
  function closeChat() {
    drawer.classList.remove('open');
    shade.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  document.querySelector('#chatOpen').addEventListener('click', openChat);
  document.querySelector('#chatClose').addEventListener('click', closeChat);
  shade.addEventListener('click', closeChat);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeChat(); });

  const mockReplies = {
    '我在担心考试': ['担心说明这件事对你很重要。先告诉我，最害怕发生的具体场景是什么？'],
    '今天有点累': ['那我们先不追求效率。今晚删掉一件不必要的任务，给身体留一点余量。'],
    '我想先安静一会儿': ['好。我会留在这里，不追问。你准备好时再继续。']
  };
  const localReplyBuckets = {
    exam: [
      '先把考试这件事拆小：你最不确定的是知识点、时间安排，还是考试现场的状态？',
      '我们不和整场考试对抗。先选一页最熟的内容，做十分钟，让身体重新得到一点掌控感。',
      '担心不等于没准备好。你可以先说一个最怕失分的地方，我陪你把它变成可行动的小步骤。'
    ],
    tired: [
      '听起来你已经撑了一段时间。现在先把目标降到很小：喝水、坐稳、只完成一个最轻的动作。',
      '累的时候，大脑会把任务看得更重。今晚可以保留一件必须做的事，其余先放到明天。',
      '你不是不努力，是需要恢复。我们先让身体慢下来，再决定下一步。'
    ],
    sleep: [
      '睡不着时别急着逼自己入睡。先把注意力放到呼气上，慢慢数三轮就好。',
      '夜里想很多很常见。你可以把脑子里最吵的一句话写下来，我们只看这一句。',
      '现在不用证明自己可以立刻睡好。先把屏幕亮度降一点，让身体收到休息信号。'
    ],
    lonely: [
      '这种一个人扛着的感觉确实会很重。此刻我在这里，先陪你把最难开口的部分说出来。',
      '你说出来的时候，已经不是完全独自面对了。我们慢一点，不急着解释。'
    ],
    action: [
      '可以。现在只定一个十分钟动作：打开资料、圈三个关键词、停下休息。',
      '下一步不用漂亮，只要足够小。你愿意先从最容易开始的那一项说起吗？',
      '我们把目标改成“开始两分钟”。完成开始，本身就是进展。'
    ],
    default: [
      '我听见了。我们可以从这句话里最沉的那个词开始，不必一次讲完。',
      '这件事听起来对你很重要。你愿意先告诉我，它最影响你的哪个时刻吗？',
      '先不用急着解决。我们把感受、事实和下一步分开放，会更容易呼吸。',
      '谢谢你愿意说。你可以继续按自己的节奏来，我会跟着你。'
    ]
  };
  const recentLocalReplies = [];
  function pickLocalReply(message) {
    if (mockReplies[message]) return mockReplies[message][0];
    const text = message.toLowerCase();
    let bucket = 'default';
    if (/考试|复习|挂科|分数|题|ddl|作业|答辩/.test(text)) bucket = 'exam';
    else if (/累|疲惫|困|撑不住|没力气|烦/.test(text)) bucket = 'tired';
    else if (/睡|失眠|熬夜|梦|夜里/.test(text)) bucket = 'sleep';
    else if (/孤独|一个人|没人|寂寞|空/.test(text)) bucket = 'lonely';
    else if (/怎么办|计划|下一步|行动|开始|做什么/.test(text)) bucket = 'action';
    const choices = localReplyBuckets[bucket] || localReplyBuckets.default;
    const available = choices.filter((line) => !recentLocalReplies.includes(line));
    const reply = (available.length ? available : choices)[Math.floor(Math.random() * (available.length ? available : choices).length)];
    recentLocalReplies.push(reply);
    if (recentLocalReplies.length > 4) recentLocalReplies.shift();
    return reply;
  }

  /* ===== LLM 适配器：三种模式 =====
   * 1. WebSocket 模式：设置 window.NEUROMATE_VTUBER_WS（如 'ws://127.0.0.1:12393/client-ws'）
   *    对接 Open-LLM-VTuber 后端（github.com/Open-LLM-VTuber/Open-LLM-VTuber）
   * 2. HTTP 模式：设置 window.NEUROMATE_LLM_ENDPOINT，POST { message, context, sessionId }
   * 3. 都未设置：本地演示回应
   */
  const CompanionLLM = {
    endpoint: window.NEUROMATE_LLM_ENDPOINT || '',
    wsEndpoint: window.NEUROMATE_VTUBER_WS || '',
    ws: null,
    wsReady: null,
    get configured() {
      return Boolean(this.wsEndpoint || this.endpoint);
    },
    connectWS() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve(this.ws);
      if (this.wsReady) return this.wsReady;
      this.wsReady = new Promise((resolve, reject) => {
        const socket = new WebSocket(this.wsEndpoint);
        this.ws = socket;
        socket.addEventListener('open', () => resolve(socket));
        socket.addEventListener('error', () => {
          this.ws = null;
          this.wsReady = null;
          reject(new Error('Open-LLM-VTuber WebSocket 连接失败'));
        });
        socket.addEventListener('close', () => {
          this.ws = null;
          this.wsReady = null;
        });
      });
      return this.wsReady;
    },
    /* Open-LLM-VTuber 协议：发送 {"type":"text-input","text":...}；
     * 回复以多条消息流回，语音分句在 audio 消息的 display_text.text 中，
     * 纯文本在 full-text 消息中；control/config 等系统消息忽略。
     * 没有显式结束信号，用「收到片段后静默 1.6 秒」判定回复完成。 */
    replyViaWS(message) {
      return new Promise((resolve, reject) => {
        const socket = this.ws;
        const audioParts = [];
        const textParts = [];
        let doneTimer = 0;
        const finish = () => {
          socket.removeEventListener('message', onMessage);
          const reply = (audioParts.length ? audioParts : textParts).join(' ').trim();
          resolve(reply || '我在听。');
        };
        const armDoneTimer = () => {
          window.clearTimeout(doneTimer);
          doneTimer = window.setTimeout(finish, 1600);
        };
        const onMessage = (event) => {
          let data;
          try { data = JSON.parse(event.data); } catch (error) { return; }
          if (!data || typeof data !== 'object') return;
          if (data.type === 'audio' && data.display_text && typeof data.display_text.text === 'string') {
            audioParts.push(data.display_text.text);
            armDoneTimer();
          } else if (data.type === 'full-text' && typeof data.text === 'string' && data.text !== 'Connection established') {
            textParts.push(data.text);
            armDoneTimer();
          }
        };
        socket.addEventListener('message', onMessage);
        socket.addEventListener('close', () => reject(new Error('Open-LLM-VTuber 连接中断')), { once: true });
        socket.send(JSON.stringify({ type: 'text-input', text: message }));
      });
    },
    async reply(message, context) {
      if (this.wsEndpoint) {
        await this.connectWS();
        return this.replyViaWS(message);
      }
      if (!this.endpoint) {
        await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 650));
        return pickLocalReply(message);
      }
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, sessionId: 'preview-session' })
      });
      if (!response.ok) throw new Error(`LLM request failed: ${response.status}`);
      const data = await response.json();
      return data.reply || data.message || data.content || '我在听。';
    }
  };
  window.NeuroMateLLMAdapter = CompanionLLM;

  const history = document.querySelector('#chatHistory');
  const adapterState = document.querySelector('#adapterState');
  function appendMessage(role, text, thinking) {
    const article = document.createElement('article');
    article.className = role === 'user' ? 'user-message' : 'assistant-message';
    if (thinking) article.classList.add('thinking');
    const label = document.createElement('span');
    label.textContent = role === 'user' ? '你' : mateName();
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    article.append(label, paragraph);
    history.appendChild(article);
    history.scrollTop = history.scrollHeight;
    return article;
  }
  async function send(text) {
    const clean = text.trim();
    if (!clean) return;
    appendMessage('user', clean, false);
    const waiting = appendMessage('assistant', '正在理解', true);
    adapterState.textContent = CompanionLLM.configured ? (CompanionLLM.wsEndpoint ? '正在连接数字人服务' : '正在连接模型服务') : '本地演示回应中';
    try {
      const reply = await CompanionLLM.reply(clean, { mood: document.querySelector('#paletteLabel').textContent });
      waiting.classList.remove('thinking');
      waiting.querySelector('p').textContent = reply;
      document.querySelector('#typewriterText').textContent = reply;
      animateActiveAvatar(reply);
      adapterState.textContent = CompanionLLM.configured ? (CompanionLLM.wsEndpoint ? '数字人服务已连接' : '模型服务已连接') : '本地演示回应中';
    } catch (error) {
      waiting.classList.remove('thinking');
      waiting.querySelector('p').textContent = '连接暂时中断了，但你刚才说的话不会因此失去意义。';
      adapterState.textContent = '服务暂时没连上，已切回本地提示';
    }
  }
  document.querySelectorAll('.chat-suggestions button').forEach((button) => button.addEventListener('click', () => send(button.textContent)));
  document.querySelector('#companionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
      input.value = '';
    }
  });

  /* ===== V1.3 · 换装 / 称呼跨页同步（数据键与 space 页对齐） =====
   * 换装数据源：neuromate-custom-space-v1.equipped（clothes / accessories）
   * 称呼：space 页暂无昵称字段，本页使用 neuromate-mate-nickname-v1，
   *       同时兼容读取 space JSON 里可能出现的 nickname 字段。
   * 三通道同步：storage 事件 + 1.5s 轮询 + visibilitychange。 */
  const SPACE_KEY = 'neuromate-custom-space-v1';
  const NICK_KEY = 'neuromate-mate-nickname-v1';
  const costumeSymbols = { star: '★', moon: '☾', sun: '☀', cloud: '☁', campus: '✎', sweater: '♨' };
  const accessorySymbols = { none: '', bow: '🎀', 'cat-ears': '🐱', 'star-wand': '🪄', 'round-glasses': '👓', hat: '▲', glasses: '∞', flower: '✿ ✿ ✿' };
  const accessoryPositions = { none: 'none', bow: 'head', 'cat-ears': 'head', 'star-wand': 'hand', 'round-glasses': 'eye', hat: 'head', glasses: 'eye', flower: 'neck' };
  const vrmAccessories = new Set(['none', 'bow', 'cat-ears', 'star-wand', 'round-glasses']);
  const lookNames = {
    clothes: { star: '星星套装', moon: '月光套装', sun: '阳光套装', cloud: '云朵套装', campus: '校园形象', sweater: '治愈系毛衣' },
    accessories: { none: '无配饰', bow: '蝴蝶结', 'cat-ears': '猫耳', 'star-wand': '星星手杖', 'round-glasses': '圆框眼镜', hat: '月影礼帽', glasses: '专注镜框', flower: '安睡花环' }
  };

  const mateNameDisplay = document.querySelector('#mateNameDisplay');
  const chatMateName = document.querySelector('#chatMateName');
  const firstMsgName = document.querySelector('#firstMsgName');
  const costumeDisplayIcon = document.querySelector('#costumeDisplayIcon');
  const accessoryDisplayIcon = document.querySelector('#accessoryDisplayIcon');
  const avatarStatusText = document.querySelector('#avatarStatusText');
  const lookLabel = document.querySelector('#lookLabel');
  const mateNameInput = document.querySelector('#mateNameInput');
  const modeHost = document.querySelector('#companionAvatarTabs');
  const firstMessageText = document.querySelector('#chatHistory .assistant-message p');

  function renderAvatarTabs() {
    if (!modeHost || !avatarList.length) return;
    modeHost.replaceChildren();
    avatarList.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.avatarMode = item.id;
      button.style.setProperty('--avatar-chip-color', item.color || '#9fb7c2');
      button.textContent = item.name;
      button.title = `${item.role}｜${item.type}`;
      button.addEventListener('click', () => {
        setAvatarMode(item.id, { message: `${item.name}已就绪。` });
        if (window.NeuroMateComfort) NeuroMateComfort.showToast(`已切换为 ${item.name}。`);
      });
      modeHost.appendChild(button);
    });
  }

  function outfitSupport(info = currentAvatar()) {
    return info.outfitSupport || { clothes: false, accessories: false, appearance: false, reason: '当前形象暂不支持这类装扮。' };
  }

  function supportsItem(category, item, info = currentAvatar()) {
    const support = outfitSupport(info);
    if (category === 'accessories' && item === 'none') return true;
    if (category === 'accessories' && info.render === 'vrm') return vrmAccessories.has(item);
    return Boolean(support[category]);
  }

  function setAvatarMode(mode, options = {}) {
    const selected = avatarRegistry ? avatarRegistry.get(mode) : null;
    currentAvatarMode = selected ? selected.id : 'yuanan';
    const info = currentAvatar();
    if (options.message) typewriterStopped = true;
    document.body.dataset.avatarMode = currentAvatarMode;
    if (avatar) {
      avatar.hidden = false;
      avatar.dataset.render = info.render || 'static';
    }
    document.querySelectorAll('[data-avatar-mode]').forEach((button) => {
      const active = button.dataset.avatarMode === currentAvatarMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (avatarRegistry) avatarRegistry.save(currentAvatarMode);
    if (window.NeuroMateApiConfig) {
      const voicePatch = {};
      if (info.voicePreset) voicePatch.voicePreset = info.voicePreset;
      if (info.voiceRate) voicePatch.rate = String(info.voiceRate);
      if (info.voicePitch) voicePatch.pitch = String(info.voicePitch);
      if (Object.keys(voicePatch).length) window.NeuroMateApiConfig.save(voicePatch);
    }
    window.dispatchEvent(new CustomEvent('neuromate:avatar-change', { detail: info }));
    if (avatarPreviewImage) {
      avatarPreviewImage.hidden = info.render === 'video';
      avatarPreviewImage.src = info.preview || info.model || 'assets/yuanchu-card.svg';
      avatarPreviewImage.alt = `${info.name}预览`;
    }
    if (avatarPreviewVideo) {
      if (info.render === 'video') {
        avatarPreviewVideo.hidden = false;
        avatarPreviewVideo.src = info.model;
        avatarPreviewVideo.play().catch(() => {});
      } else {
        avatarPreviewVideo.pause();
        avatarPreviewVideo.removeAttribute('src');
        avatarPreviewVideo.hidden = true;
      }
    }
    if (avatarRenderBadge) avatarRenderBadge.textContent = info.type || info.render || '形象';
    if (avatarCostumeDisplay) avatarCostumeDisplay.dataset.modelName = `${info.name} · ${info.type}`;
    applyName(loadSpaceSnapshot());
    applyCostume(loadSpaceSnapshot());
    document.querySelector('#typewriterText').textContent = options.message || `${info.name}在线。${info.role}`;
    if (firstMessageText) firstMessageText.textContent = `${info.name}在这里。${info.desc}`;
    updateCostumePanel();
  }

  function loadSpaceSnapshot() {
    try {
      const saved = JSON.parse(localStorage.getItem(SPACE_KEY));
      if (saved && saved.equipped) return saved;
    } catch (error) { /* 原型允许无存储 */ }
    return { equipped: { clothes: 'star', accessories: 'none', appearance: 'clear' } };
  }
  function writeSpace(snapshot) {
    try { localStorage.setItem(SPACE_KEY, JSON.stringify(snapshot)); } catch (error) { /* ignore */ }
  }
  function readNickname() {
    try { return localStorage.getItem(NICK_KEY) || ''; } catch (error) { return ''; }
  }
  function mateName() {
    return (mateNameDisplay && mateNameDisplay.textContent.trim()) || '元元';
  }
  function applyCostume(snapshot) {
    const equip = snapshot.equipped || {};
    const clothes = equip.clothes || 'star';
    const accessory = equip.accessories || 'none';
    costumeDisplayIcon.textContent = costumeSymbols[clothes] || '★';
    if (accessory === 'none') {
      accessoryDisplayIcon.textContent = '';
      accessoryDisplayIcon.dataset.position = 'none';
      accessoryDisplayIcon.style.display = 'none';
    } else {
      accessoryDisplayIcon.textContent = accessorySymbols[accessory] || accessory;
      accessoryDisplayIcon.dataset.position = accessoryPositions[accessory] || 'head';
      accessoryDisplayIcon.style.display = '';
    }
    const plain = clothes === 'star' && accessory === 'none';
    const info = currentAvatar();
    const support = outfitSupport(info);
    const outfitText = plain ? '可以开始' : `${lookNames.clothes[clothes]}${accessory === 'none' ? '' : ' + ' + lookNames.accessories[accessory]}`;
    avatarStatusText.textContent = support.clothes || support.accessories ? `${info.name} · ${info.type} · ${outfitText}` : `${info.name} · ${info.type} · 稳定展示`;
    if (lookLabel) lookLabel.textContent = support.clothes || support.accessories ? `${lookNames.clothes[clothes]} · ${lookNames.accessories[accessory]}` : '当前形象先保留原始外观';
  }
  function applyName(snapshot) {
    const info = currentAvatar();
    const customName = ((snapshot && snapshot.nickname) || readNickname() || '').trim();
    const name = customName && info.id === 'yuanchu' ? customName : info.name;
    if (mateNameDisplay) mateNameDisplay.textContent = name;
    if (chatMateName) chatMateName.textContent = name;
    if (firstMsgName) firstMsgName.textContent = name;
    const avatar = document.querySelector('#humanAvatar');
    if (avatar) avatar.setAttribute('aria-label', `和${name}打招呼`);
  }
  function updateCostumePanel() {
    const snapshot = loadSpaceSnapshot();
    const equip = snapshot.equipped || {};
    const info = currentAvatar();
    const reason = outfitSupport(info).reason || '当前形象暂不支持这类装扮。';
    document.querySelectorAll('.costume-options button').forEach((button) => {
      const category = button.parentElement.dataset.category;
      const item = button.dataset.item;
      const active = equip[category] === item;
      const supported = supportsItem(category, item, info);
      button.classList.toggle('active', active);
      button.classList.toggle('is-locked', !supported);
      button.disabled = !supported;
      button.title = supported ? button.textContent.trim() : `${info.name}暂不支持：${reason}`;
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function syncFromStorage() {
    const snapshot = loadSpaceSnapshot();
    applyCostume(snapshot);
    applyName(snapshot);
    updateCostumePanel();
  }

  function applyAgentHandoff() {
    let handoff = null;
    try { handoff = JSON.parse(sessionStorage.getItem('neuromate.agentContext') || 'null'); } catch (error) { handoff = null; }
    if (!handoff || !handoff.avatar) return;
    const summary = handoff.strategy || '继续刚才的分析';
    appendMessage('assistant', `我刚和 Agent 团队梳理过你的情况（${handoff.scenario || '情绪分析'}，策略：${summary}）。我们接着往下走，你现在想先聊哪一步？`, true);
    adapterState.textContent = '已承接 Agent 集群结果';
    sessionStorage.removeItem('neuromate.agentContext');
  }

  document.querySelectorAll('.costume-options button').forEach((button) => button.addEventListener('click', () => {
    const category = button.parentElement.dataset.category;
    const item = button.dataset.item;
    if (!supportsItem(category, item)) {
      if (window.NeuroMateComfort) NeuroMateComfort.showToast(outfitSupport().reason || '当前形象暂不支持这类装扮。');
      return;
    }
    const snapshot = loadSpaceSnapshot();
    const current = (snapshot.equipped || {})[category];
    const next = current === item ? (category === 'clothes' ? 'star' : 'none') : item; // 再点已穿戴项 = 脱下
    snapshot.equipped[category] = next;
    writeSpace(snapshot);
    syncFromStorage();
    if (window.NeuroMateCompanionRenderer) {
      window.NeuroMateCompanionRenderer.refreshOutfitImage();
      window.NeuroMateCompanionRenderer.applyAccessories();
    }
    if (window.NeuroMateComfort) NeuroMateComfort.showToast(next === item ? '已换上，预览会同步更新。' : '已脱下，恢复默认装扮。');
  }));

  document.querySelectorAll('[data-scene]').forEach((button) => button.addEventListener('click', () => {
    const scene = button.dataset.scene;
    if (window.NeuroMateCompanionRenderer) window.NeuroMateCompanionRenderer.applyScene(scene);
    if (window.NeuroMateComfort) NeuroMateComfort.showToast({ day: '已切换到白天场景。', night: '已切换到黑夜场景。', rain: '下雨了，注意别着凉。' }[scene] || '场景已切换。');
  }));

  const mateNameSave = document.querySelector('#mateNameSave');
  if (mateNameSave) {
    mateNameSave.addEventListener('click', () => {
      const name = (mateNameInput.value || '').trim().slice(0, 8) || '元元';
      try { localStorage.setItem(NICK_KEY, name); } catch (error) { /* ignore */ }
      applyName(loadSpaceSnapshot());
      if (window.NeuroMateComfort) NeuroMateComfort.showToast(`好的，以后就这样称呼你：${name}`);
    });
    mateNameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') mateNameSave.click(); });
  }

  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === SPACE_KEY || event.key === NICK_KEY) syncFromStorage();
  });
  window.setInterval(syncFromStorage, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncFromStorage(); });

  // 初始化：默认平静光环 + 应用已保存的装扮与称呼
  if (!document.body.dataset.mood) document.body.dataset.mood = 'calm';
  if (mateNameInput) mateNameInput.value = readNickname() || '';
  renderAvatarTabs();
  setAvatarMode(currentAvatarMode);
  syncFromStorage();
  applyAgentHandoff();
})();
