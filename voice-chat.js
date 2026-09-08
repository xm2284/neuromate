/* ========== 元知己 · 沉浸式语音谈心逻辑 V2.0 ==========
 * 核心：Web Speech API 语音识别 + 语音合成 + 环境音生成
 * 模拟真人心理咨询师温柔轻声对话
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) document.body.dataset.reducedMotion = 'true';
  const avatarRegistry = window.NeuroMateAvatarRegistry;
  function activeSiteAvatar() {
    return avatarRegistry ? avatarRegistry.get(avatarRegistry.load()) : { name: '元元', role: '数字人陪伴', desc: '我在这里。' };
  }
  function saveSiteAvatar(id) {
    if (avatarRegistry) avatarRegistry.save(id);
  }

  // ---------- V1.6：向 3D 数字人派发事件（voice-avatar.js 监听） ----------
  function dispatchAvatar(type, extra = {}) {
    document.dispatchEvent(new CustomEvent('dh:avatar', { detail: { type, ...extra } }));
  }
  function inferExpression(text) {
    if (/累|疲惫|放松|平静|安静|沉下/.test(text)) return 'relaxed';
    if (/孤独|焦虑|担心|害怕|心疼|难过|紧张|不安/.test(text)) return 'sad';
    if (/开心|太好了|勇气|很好|欢迎|谢谢你/.test(text)) return 'happy';
    if (/想象|听一听|注意|试试/.test(text)) return 'surprised';
    return 'relaxed';
  }

  // ---------- 对话状态 ----------
  const state = {
    voiceURI: null,        // 选定的人声
    voicePreset: (activeSiteAvatar().voicePreset || window.NEUROMATE_VOICE_PRESET || 'female-soft'),
    rate: Number(window.NEUROMATE_VOICE_RATE || 0.85),            // 语速：缓慢
    pitch: Number(window.NEUROMATE_VOICE_PITCH || 1.0),            // 音调：平稳
    style: 'empathy',      // 对话风格
    ambient: 'none',       // 环境音
    volume: 0.6,           // 音量
    isListening: false,    // 正在录音
    isSpeaking: false,     // AI 正在说话
    isPaused: false,       // 对话暂停
    conversationContext: [] // 对话上下文
  };
  state.autoSpeak = false;

  // ---------- 预设人声匹配 ----------
  const voicePreferences = {
    'female-soft': {
      langPref: ['zh-CN', 'zh-TW', 'zh'],
      preferred: /xiaoxiao|xiaoyi|xiaomo|晓晓|晓伊|小|natural|female|女/i,
      genderHint: /female|女|ting|mei|xiao|hui|yaoyao|晓|瑶/i
    },
    'female-warm': {
      langPref: ['zh-CN', 'zh-TW', 'zh'],
      preferred: /xiaoxiao|xiaoyi|xiaomo|xiaohan|晓晓|晓伊|晓墨|晓涵|natural|female|女/i,
      genderHint: /female|女|ting|mei|xiao|hui|han|晓|涵/i
    },
    'male-gentle': {
      langPref: ['zh-CN', 'zh-TW', 'zh'],
      preferred: /yunxi|yunyang|xiaobei|kang|云希|云扬|小北|康|natural|male|男/i,
      genderHint: /male|男|yun|kang|wei|云|康|伟/i
    }
  };

  let availableVoices = [];
  let voiceCurrentText = null;
  let voiceRefreshBtn = null;
  function loadVoices() {
    availableVoices = window.speechSynthesis
      ? window.speechSynthesis.getVoices().filter((voice) => /^zh/i.test(voice.lang || '') || /Chinese|China|中文|普通话/i.test(`${voice.name} ${voice.voiceURI}`))
      : [];
    selectVoice(state.voicePreset);
    updateVoiceStatus();
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function selectVoice(voiceType) {
    if (!availableVoices.length) {
      state.voiceURI = null;
      updateVoiceStatus();
      return;
    }
    const pref = voicePreferences[voiceType] || voicePreferences['female-soft'];
    let voice = availableVoices.find(v => pref.langPref.some(l => v.lang.startsWith(l)) && pref.preferred.test(`${v.name} ${v.voiceURI}`));
    if (!voice) voice = availableVoices.find(v => pref.langPref.some(l => v.lang.startsWith(l)) && pref.genderHint.test(v.name));
    if (!voice) voice = availableVoices.find(v => pref.langPref.some(l => v.lang.startsWith(l)));
    if (!voice) voice = availableVoices[0];
    state.voiceURI = voice.voiceURI;
    updateVoiceStatus();
  }

  // ---------- 温柔回应语料库 ----------
  const responses = {
    empathy: {
      greeting: [
        '我在这里。今天，你愿意和我说说心里最想说的话吗？不用组织得太完整，慢慢来就好。',
        '欢迎你来到这里。这是属于你的安静时间，没有评判，没有催促。'
      ],
      tired: [
        '听起来你今天真的很累了。先不用想接下来要做什么，允许自己就这样停一会儿。你的身体一直在努力，它也需要被温柔对待。',
        '累的时候，不必硬撑着继续。我们可以就这样安静地坐着，什么也不做，也是可以的。'
      ],
      anxious: [
        '焦虑来的时候，身体会变得紧绷。我们现在不急着解决它，先一起做一次缓慢的呼吸，让肩膀松下来一点。',
        '你愿意说出来，本身就需要勇气。那些担忧只是脑子里的信号，不一定是真的会发生的事。我在这里陪你。'
      ],
      lonely: [
        '孤独感有时候很沉。但此刻，你并不是一个人——我在这里，认真地听着你说的每一个字。',
        '即使周围很安静，你的感受也是真实的，也是值得被听见的。我陪着你。'
      ],
      sleep: [
        '睡不着的时候，越用力想睡，反而越清醒。我们可以试着不去想"必须睡着"，只是让身体慢慢放松下来。',
        '夜晚的安静有时候会让思绪变得更清晰。如果你愿意，可以试着闭上眼睛，听我的声音，跟着它慢慢呼吸。'
      ],
      default: [
        '我听见了。你能说出来，已经很不容易了。我们可以从这句话里最沉的那个词开始，不必一次讲完。',
        '嗯，我在听。你说的每一句话，我都不会评判。继续按你的节奏来。',
        '听起来这件事对你很重要。我们一起慢慢看，不着急找到答案。',
        '你的感受是合理的。不管是什么样的情绪，它都可以在这里被接住。',
        '谢谢你愿意告诉我这些。你已经做得很好了，真的。'
      ]
    },
    mindfulness: {
      greeting: [
        '让我们先一起做一次呼吸。慢慢吸气，感受空气进入身体；再缓缓呼出，把注意力带回到此刻。',
        '欢迎。先让自己找到一个舒服的姿势，然后我们慢慢开始。'
      ],
      tired: [
        '闭上眼睛，感受一下身体哪个部位最累。把注意力放在那里，只是感受，不需要改变什么。每一次呼气，让那个部位再松一点。',
        '现在，把呼吸放慢。吸气四秒，呼气六秒。让疲惫随着呼气慢慢流出身体。'
      ],
      anxious: [
        '我们来做一个练习。注意你此刻双脚踩在地上的感觉，感受那个支撑。焦虑只是思绪，而你的身体此刻是安全的。',
        '把注意力放在呼吸上。每次思绪飘走，轻轻把它带回来。不需要责怪自己，飘走再带回来就好。'
      ],
      lonely: [
        '此刻，把一只手放在胸口，感受那里的温度。这个温度就是你给自己的陪伴，它一直在。',
        '听一听周围的声音，不管是什么。你此刻在这个空间里，这个空间也在容纳着你。'
      ],
      sleep: [
        '从脚趾开始，感受每个部位慢慢变沉、变松。不需要用力，只是让它自然地沉下去。',
        '想象一个让你感到安全的地方。不用很清晰，只要那个感觉在就好。我在这里陪着你。'
      ],
      default: [
        '把注意力带回到呼吸上。吸气，呼气。你此刻只需要做这一件事。',
        '感受你的身体此刻坐着或躺着的地方。你被支撑着，你可以放松。',
        '思绪来来去去，就像云一样。你不需要抓住它们，也不需要推开它们。',
        '每一次呼吸，都是一次重新开始的机会。你做得很好。'
      ]
    },
    relax: {
      greeting: [
        '欢迎来到这个安静的空间。让我们把外界的嘈杂都放在门外，只留这一刻的平静。',
        '在这里，什么都不需要做，什么都不需要想。只是呼吸，只是存在。'
      ],
      tired: [
        '想象你正躺在一片柔软的草地上，阳光温暖地洒下来。身体慢慢变得很轻，很放松。',
        '每一次呼气，都让身体沉得更深一点。就像融化在温暖的水里，安全，放松。'
      ],
      anxious: [
        '想象一片平静的湖面，微风轻轻吹过，泛起很小的涟漪。你的思绪就是那些涟漪，会来，也会走。',
        '把紧张感想象成一团雾，随着每一次呼气，它慢慢散开，变淡。你很安全。'
      ],
      lonely: [
        '想象一个温暖的怀抱，把你轻轻地包裹住。那个温度，就是此刻你给自己的善意。',
        '在这个安静的空间里，你并不孤单。我的声音会一直陪着你。'
      ],
      sleep: [
        '想象夜空中的星星，一颗一颗慢慢亮起来。每数一颗，身体就更沉一点，更放松一点。',
        '把所有的思绪都放进一只小船里，看着它慢慢漂远。你只需要留在这里，安静地呼吸。'
      ],
      default: [
        '让自己慢慢沉入这份安静。什么都不用想，什么都不用做。',
        '你的身体知道如何放松，只需要给它一点时间和空间。',
        '每一次呼吸，都让平静再深一点。你正在被温柔地托住。',
        '这里的节奏很慢，很慢。你可以完全地放下。'
      ]
    }
  };

  function getResponse(input) {
    const style = state.style;
    const bank = responses[style] || responses.empathy;
    const text = (input || '').toLowerCase();

    let category = 'default';
    if (!input || text.length < 2) category = 'greeting';
    else if (/累|疲惫|没力气|撑不住|耗尽/.test(text)) category = 'tired';
    else if (/焦虑|紧张|担心|害怕|不安|慌/.test(text)) category = 'anxious';
    else if (/孤独|一个人|没人|寂寞|空虚/.test(text)) category = 'lonely';
    else if (/睡|失眠|睡不着|梦|夜里/.test(text)) category = 'sleep';

    return pickRandom(bank[category] || bank.default, `${style}-${category}`);
  }

  async function resolveResponse(input) {
    const config = window.NEUROMATE_API_CONFIG || {};
    if (!config.httpEndpoint) return getResponse(input);
    try {
      const response = await fetch(config.httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          message: input,
          model: config.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: '你是元知己的温柔陪伴型数字人，回答要短、稳、像真实陪伴，不做医疗诊断。' },
            ...state.conversationContext.map((item) => ({ role: item.role === 'ai' ? 'assistant' : 'user', content: item.text })),
            { role: 'user', content: input }
          ],
          context: { style: state.style, source: 'voice-chat' }
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.reply || data.message || data.content || data.choices?.[0]?.message?.content || getResponse(input);
    } catch (error) {
      showToast('接口暂时没连上，已切回本地演示回应。');
      return getResponse(input);
    }
  }

  const recentResponseByGroup = {};
  function pickRandom(arr, group = 'default') {
    const options = arr.length > 1 ? arr.filter((line) => line !== recentResponseByGroup[group]) : arr;
    const reply = options[Math.floor(Math.random() * options.length)];
    recentResponseByGroup[group] = reply;
    return reply;
  }

  // ---------- DOM 元素 ----------
  const conversation = document.querySelector('#voiceConversation');
  const speakingIndicator = document.querySelector('#speakingIndicator');
  const micBtn = document.querySelector('#voiceMic');
  const pauseBtn = document.querySelector('#voicePause');
  const textForm = document.querySelector('#voiceTextForm');
  const textInput = document.querySelector('#voiceTextInput');
  const ambientSelect = document.querySelector('#ambientSelect');
  const volumeSlider = document.querySelector('#volumeSlider');
  const settingsBtn = document.querySelector('#voiceSettings');
  const settingsDialog = document.querySelector('#settingsDialog');
  voiceCurrentText = document.querySelector('#voiceCurrentText');
  voiceRefreshBtn = document.querySelector('#voiceRefresh');
  const toast = document.querySelector('#toast');
  const voiceAvatarSwitch = document.querySelector('#voiceAvatarSwitch');
  const statusText = document.querySelector('.status-text');
  const stylePlaceholders = {
    empathy: '也可以打字告诉我，先说最真实的一句……',
    mindfulness: '写下此刻的身体感觉，我陪你慢慢放松……',
    relax: '说一个想放下的念头，我们轻一点处理……'
  };

  function voicePresetLabel(preset) {
    return {
      'female-soft': '温柔女声',
      'female-warm': '舒缓女声',
      'male-gentle': '温和男声'
    }[preset] || '跟随角色';
  }

  function updateVoiceStatus() {
    if (!voiceCurrentText) return;
    const voice = availableVoices.find(v => v.voiceURI === state.voiceURI);
    const source = voice ? `${voice.name}（${voice.lang || '默认语言'}）` : '本机没有可枚举中文音色，播放时使用浏览器默认音色';
    voiceCurrentText.textContent = `${activeSiteAvatar().name} · ${voicePresetLabel(state.voicePreset)} · ${source} · 语速 ${state.rate.toFixed(2)} / 音高 ${state.pitch.toFixed(2)}`;
  }

  function renderVoiceAvatarSwitch() {
    if (!voiceAvatarSwitch || !avatarRegistry) return;
    voiceAvatarSwitch.replaceChildren();
    avatarRegistry.all.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.avatarId = item.id;
      button.textContent = item.name;
      button.style.setProperty('--avatar-color', item.color || '#9fb7c2');
      button.addEventListener('click', () => {
        saveSiteAvatar(item.id);
        applySiteAvatar({ toast: true });
      });
      voiceAvatarSwitch.appendChild(button);
    });
  }

  function applySiteAvatar(options = {}) {
    const info = activeSiteAvatar();
    document.body.dataset.avatarMode = info.id || '';
    document.querySelectorAll('.vrm-name').forEach((node) => { node.textContent = info.name; });
    if (statusText) statusText.textContent = `${info.name}在这里，随时倾听`;
    state.voicePreset = info.voicePreset || state.voicePreset;
    if (info.voiceRate) state.rate = Number(info.voiceRate);
    if (info.voicePitch) state.pitch = Number(info.voicePitch);
    selectVoice(state.voicePreset);
    if (window.NeuroMateApiConfig) {
      const voicePatch = {};
      if (info.voicePreset) voicePatch.voicePreset = info.voicePreset;
      if (info.voiceRate) voicePatch.rate = String(info.voiceRate);
      if (info.voicePitch) voicePatch.pitch = String(info.voicePitch);
      if (Object.keys(voicePatch).length) window.NeuroMateApiConfig.save(voicePatch);
    }
    document.querySelectorAll('[data-voice]').forEach((btn) => {
      const active = btn.dataset.voice === state.voicePreset;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    document.querySelectorAll('[data-rate]').forEach((btn) => {
      const active = Number(btn.dataset.rate) === state.rate;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    if (voiceAvatarSwitch) {
      voiceAvatarSwitch.querySelectorAll('button[data-avatar-id]').forEach((button) => {
        const active = button.dataset.avatarId === info.id;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
    if (options.toast) showToast(`语音模式已同步为${info.name}。`);
    updateVoiceStatus();
  }

  let toastTimer;
  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ---------- 添加对话气泡 ----------
  function addBubble(role, text, options = {}) {
    const bubble = document.createElement('article');
    bubble.className = `voice-bubble voice-bubble--${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'bubble-avatar';
    if (role === 'ai') {
      const info = activeSiteAvatar();
      avatar.textContent = info.short || info.name.slice(0, 1);
      avatar.style.setProperty('--bubble-avatar-color', info.color || '#9fb7c2');
    }

    const content = document.createElement('div');
    content.className = 'bubble-content';

    const name = document.createElement('span');
    name.className = 'bubble-name';
    name.textContent = role === 'ai' ? activeSiteAvatar().name : '我';

    const textEl = document.createElement('p');
    textEl.className = 'bubble-text';
    textEl.textContent = text;

    content.append(name, textEl);
    bubble.append(avatar, content);
    conversation.appendChild(bubble);

    // 平滑滚动到底部
    requestAnimationFrame(() => {
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: reducedMotion || document.body.dataset.motionPaused ? 'auto' : 'smooth' });
    });

    return textEl;
  }

  // ---------- AI 语音合成（说话） ----------
  let currentUtterance = null;

  function speak(text, opts = {}) {
    if (!window.speechSynthesis) {
      // 无语音合成能力：仅显示文字
      if (!opts.reuseEl) addBubble('ai', text);
      return;
    }

    // 停止之前的播放
    window.speechSynthesis.cancel();
    state.isSpeaking = true;
    dispatchAvatar('speak-start');
    dispatchAvatar('expression', { name: inferExpression(text) });

    const el = opts.reuseEl || addBubble('ai', text);
    el.classList.add('is-speaking');
    speakingIndicator.classList.add('is-active');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = state.rate;
    utterance.pitch = state.pitch;
    utterance.volume = state.volume;

    // 选择人声
    const voice = availableVoices.find(v => v.voiceURI === state.voiceURI);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      state.isSpeaking = false;
      el.classList.remove('is-speaking');
      speakingIndicator.classList.remove('is-active');
      currentUtterance = null;
      dispatchAvatar('speak-end');
    };

    utterance.onerror = () => {
      state.isSpeaking = false;
      el.classList.remove('is-speaking');
      speakingIndicator.classList.remove('is-active');
      currentUtterance = null;
      dispatchAvatar('speak-end');
    };

    currentUtterance = utterance;
    state.conversationContext.push({ role: 'ai', text });

    // 延迟一点再开始，让气泡先出现
    setTimeout(() => {
      if (!state.isPaused) window.speechSynthesis.speak(utterance);
    }, 300);
  }

  // ---------- 打断 AI 发言 ----------
  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.isSpeaking = false;
    speakingIndicator.classList.remove('is-active');
    document.querySelectorAll('.bubble-text.is-speaking').forEach(el => el.classList.remove('is-speaking'));
    dispatchAvatar('speak-end');
  }

  // ---------- 语音识别（听用户说话） ----------
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  } else if (micBtn) {
    micBtn.classList.add('is-unavailable');
    micBtn.setAttribute('aria-disabled', 'true');
    micBtn.querySelector('.mic-label').textContent = '可打字';
  }

  function startListening() {
    if (!recognition) {
      showToast('当前浏览器不支持语音识别，可以直接打字聊天。');
      textInput.focus();
      return;
    }
    if (state.isSpeaking) stopSpeaking(); // 打断 AI

    state.isListening = true;
    micBtn.setAttribute('aria-pressed', 'true');
    micBtn.classList.add('is-active');
    micBtn.querySelector('.mic-label').textContent = '正在听…';
    dispatchAvatar('listen-start');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleUserInput(transcript);
    };

    recognition.onerror = (event) => {
      showToast('没有听清，可以再说一次，或用文字输入。');
    };

    recognition.onend = () => {
      state.isListening = false;
      micBtn.setAttribute('aria-pressed', 'false');
      micBtn.classList.remove('is-active');
      micBtn.querySelector('.mic-label').textContent = '点击说话';
      dispatchAvatar('listen-end');
    };

    try {
      recognition.start();
    } catch (e) {
      showToast('请再按一次开始说话。');
    }
  }

  function stopListening() {
    if (recognition && state.isListening) {
      try { recognition.stop(); } catch (e) { /* ignore */ }
    }
    state.isListening = false;
    micBtn.setAttribute('aria-pressed', 'false');
    micBtn.classList.remove('is-active');
    micBtn.querySelector('.mic-label').textContent = '点击说话';
    dispatchAvatar('listen-end');
  }

  // 点击切换麦克风
  micBtn.addEventListener('click', () => {
    if (state.isListening) stopListening();
    else startListening();
  });

  // ---------- 处理用户输入 ----------
  function handleUserInput(text) {
    const clean = (text || '').trim();
    if (!clean) return;

    addBubble('user', clean);
    state.conversationContext.push({ role: 'user', text: clean });

    // 隐藏快捷入口（已有对话后）
    const quick = document.querySelector('#voiceQuick');
    if (quick && state.conversationContext.length > 2) {
      quick.style.opacity = '0.5';
    }

    // 延迟回应，模拟思考
    const delay = reducedMotion || document.body.dataset.motionPaused ? 400 : 1200;
    setTimeout(async () => {
      const reply = await resolveResponse(clean);
      speak(reply);
    }, delay);
  }

  // ---------- 文字输入 ----------
  textForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = textInput.value;
    if (text.trim()) {
      handleUserInput(text);
      textInput.value = '';
    }
  });

  // ---------- 快捷情绪入口 ----------
  document.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // 视觉反馈：短暂标记为已发送
      btn.classList.add('is-selected');
      btn.disabled = true;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span class="quick-icon">✓</span>已发送';

      setTimeout(() => {
        btn.classList.remove('is-selected');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }, 1200);

      const quick = btn.dataset.quick;
      const textMap = {
        tired: '今天有点累',
        anxious: '我有些焦虑',
        lonely: '感到孤独',
        sleep: '睡不着'
      };
      handleUserInput(textMap[quick] || btn.textContent);
    });
  });

  // ---------- 暂停 / 恢复 ----------
  pauseBtn.addEventListener('click', () => {
    state.isPaused = !state.isPaused;
    pauseBtn.setAttribute('aria-pressed', String(state.isPaused));

    if (state.isPaused) {
      stopSpeaking();
      stopListening();
      pauseBtn.setAttribute('aria-label', '继续对话');
      showToast('对话已暂停。准备好时再继续，不着急。');
    } else {
      pauseBtn.setAttribute('aria-label', '暂停对话');
      showToast('欢迎回来。我们继续，慢慢来。');
    }
  });

  // ---------- 环境音（Web Audio API 生成） ----------
  let audioCtx = null;
  let ambientNodes = [];

  function initAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* 不支持 */ }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function stopAmbient() {
    ambientNodes.forEach(node => {
      if (node.stop) try { node.stop(); } catch (e) { /* ignore */ }
      if (node.disconnect) try { node.disconnect(); } catch (e) { /* ignore */ }
    });
    ambientNodes = [];
  }

  function startAmbient(type) {
    stopAmbient();
    if (type === 'none' || !audioCtx) return;

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = state.volume * 0.3; // 环境音比语音轻
    masterGain.connect(audioCtx.destination);

    if (type === 'rain') {
      // 雨声：白噪音 + 低通滤波
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      ambientNodes.push(noise, filter, masterGain);
    } else if (type === 'forest') {
      // 林间风声：粉噪音 + 带通 + 缓慢调制
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.08;
        b2 = 0.90 * b2 + white * 0.15;
        data[i] = (b0 + b1 + b2) * 0.5;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      filter.Q.value = 0.8;
      // 缓慢调制频率模拟风
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.1;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      lfo.start();
      ambientNodes.push(noise, filter, lfo, lfoGain, masterGain);
    } else if (type === 'whitenoise') {
      // 白噪音
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 8000;
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start();
      ambientNodes.push(noise, filter, masterGain);
    }
  }

  ambientSelect.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-ambient]');
    if (!btn) return;
    ambientSelect.querySelector('.active').classList.remove('active');
    btn.classList.add('active');
    state.ambient = btn.dataset.ambient;
    initAudio();
    startAmbient(state.ambient);
    if (state.ambient !== 'none') {
      const labels = { rain: '雨声', forest: '林间风声', whitenoise: '白噪音' };
      showToast(`${labels[state.ambient]}已开启，伴随你的对话。`);
    }
  });

  // ---------- 音量 ----------
  let volumeToastTimer = null;
  volumeSlider.addEventListener('input', () => {
    state.volume = Number(volumeSlider.value) / 100;
    if (window.speechSynthesis) {
      // 语音合成音量会在下次播放时生效
    }
    // 环境音实时调节
    if (ambientNodes.length > 0) {
      const master = ambientNodes[ambientNodes.length - 1];
      if (master && master.gain) master.gain.value = state.volume * 0.3;
    }
    // 实时显示音量百分比
    const pct = Math.round(volumeSlider.value);
    window.clearTimeout(volumeToastTimer);
    showToast(`音量 ${pct}%`);
    volumeToastTimer = window.setTimeout(() => toast.classList.remove('show'), 1000);
  });

  // ---------- 设置面板 ----------
  settingsBtn.addEventListener('click', () => settingsDialog.showModal());

  document.querySelectorAll('[data-voice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-voice]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.voicePreset = btn.dataset.voice;
      selectVoice(btn.dataset.voice);
      if (window.NeuroMateApiConfig) window.NeuroMateApiConfig.save({ voicePreset: state.voicePreset });
      updateVoiceStatus();
      showToast('人声已更新，下次回应时生效。');
    });
  });

  if (voiceRefreshBtn) {
    voiceRefreshBtn.addEventListener('click', () => {
      loadVoices();
      showToast(availableVoices.length ? '已重新读取本机中文音色。' : '本机暂时没有可枚举中文音色，会使用浏览器默认音色。');
    });
  }

  renderVoiceAvatarSwitch();
  applySiteAvatar();

  window.addEventListener('storage', (event) => {
    if (event.key === (window.NEUROMATE_AVATAR_KEY || 'neuromate-avatar-mode-v16')) applySiteAvatar();
  });

  document.querySelectorAll('[data-rate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rate]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.rate = Number(btn.dataset.rate);
      if (window.NeuroMateApiConfig) window.NeuroMateApiConfig.save({ rate: String(state.rate) });
      updateVoiceStatus();
    });
  });

  document.querySelectorAll('[data-voice]').forEach((btn) => {
    const active = btn.dataset.voice === state.voicePreset;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
  document.querySelectorAll('[data-rate]').forEach((btn) => {
    const active = Number(btn.dataset.rate) === state.rate;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });

  document.querySelectorAll('[data-style]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-style]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      state.style = btn.dataset.style;
      textInput.placeholder = stylePlaceholders[state.style] || stylePlaceholders.empathy;
      const labels = { empathy: '共情倾听', mindfulness: '正念引导', relax: '放松冥想' };
      showToast(`已切换到${labels[state.style]}模式。`);
    });
  });

  // ---------- 页面卸载清理 ----------
  window.addEventListener('beforeunload', () => {
    stopSpeaking();
    stopAmbient();
    if (audioCtx) audioCtx.close();
  });

  // ---------- 初始问候 ----------
  // 页面加载时只显示文字问候；语音播报由用户发送消息后触发。
  const initialGreeting = getResponse('');
  textInput.placeholder = stylePlaceholders[state.style] || stylePlaceholders.empathy;
  addBubble('ai', initialGreeting);
  updateVoiceStatus();

})();
