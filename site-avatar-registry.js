(function () {
  'use strict';

  window.NEUROMATE_SITE_AVATARS = [
    {
      id: 'yuanan',
      name: '元安',
      short: '安',
      role: '主形象 · 温柔学姐',
      type: 'Live2D',
      render: 'live2d',
      desc: '默认主形象，温柔、稳定，适合日常陪伴和考前安抚。',
      source: 'Hiyori Live2D',
      color: '#e8a0b4',
      model: 'integrations/digital-human-demo/model/live2d/hiyori/Hiyori.model3.json',
      preview: 'assets/digital-human.png',
      quality: 'high',
      outfitSupport: { clothes: false, accessories: false, appearance: false, reason: '元安是 Live2D 主形象，当前展示完整模型，不硬套静态装扮。' },
      voicePreset: 'female-soft',
      voiceRate: 1.08,
      voicePitch: 1.12,
      live2dView: { h: 1.1, w: 1.04, y: 1.04 }
    },
    {
      id: 'yuanqing',
      name: '元晴',
      short: '晴',
      role: '元气少女',
      type: 'Live2D',
      render: 'live2d',
      desc: '更明亮、更有活力，适合把低落状态慢慢带起来。',
      source: 'shizuku Live2D',
      color: '#7ec8a3',
      model: 'integrations/digital-human-demo/model/live2d/shizuku/shizuku.model.json',
      preview: 'assets/yuanchu-card.svg',
      quality: 'high',
      outfitSupport: { clothes: false, accessories: false, appearance: false, reason: '元晴是 Live2D 形象，当前先保留稳定展示。' },
      voicePreset: 'female-warm',
      voiceRate: 1.03,
      voicePitch: 1.16,
      live2dView: { h: 1.02, w: 0.94, y: 1.02 }
    },
    {
      id: 'yuanche',
      name: '元澈',
      short: '澈',
      role: '沉稳学长',
      type: 'Live2D',
      render: 'live2d',
      desc: '理性、低噪、适合帮用户拆解问题、复盘任务。',
      source: 'Natori Live2D',
      color: '#7c8aa8',
      model: 'integrations/digital-human-demo/model/live2d/Natori/Natori.model3.json',
      preview: 'assets/yuanchu-card.svg',
      quality: 'high',
      outfitSupport: { clothes: false, accessories: false, appearance: false, reason: '元澈是 Live2D 学长形象，当前先保留模型本身。' },
      voicePreset: 'male-gentle',
      voiceRate: 0.92,
      voicePitch: 0.88,
      live2dView: { h: 1.0, w: 0.95, y: 1.0 }
    },
    {
      id: 'mao',
      name: '虹色Mao',
      short: 'M',
      role: '魔术少女 · 官方示例',
      type: 'Live2D',
      render: 'live2d',
      desc: 'Live2D 官方示例角色 Mao，是魔术少女，不是猫咪，也不是元喵。',
      source: 'Mao 官方样例',
      color: '#c9a06c',
      model: 'integrations/digital-human-demo/model/live2d/mao_zh-Hans/runtime/mao_pro.model3.json',
      preview: 'assets/yuanchu-card.svg',
      quality: 'medium',
      outfitSupport: { clothes: false, accessories: false, appearance: false, reason: '虹色 Mao 是示例 Live2D 角色，不混用项目装扮。' },
      voicePreset: 'female-warm',
      voiceRate: 1.0,
      voicePitch: 1.1,
      live2dView: { h: 0.9, w: 0.84, y: 0.98 }
    },
    {
      id: 'panda',
      name: '元元熊猫',
      short: '熊',
      role: '治愈熊猫 · 视频形象',
      type: '视频',
      render: 'video',
      desc: '熊猫形象，是独立的视频形象；注意它和 Mao 不是一个角色。',
      source: 'panda.mp4',
      color: '#89a98b',
      model: 'integrations/digital-human-demo/assets/panda.mp4',
      preview: 'assets/yuanchu-card.svg',
      quality: 'medium',
      outfitSupport: { clothes: false, accessories: false, appearance: false, reason: '熊猫是视频形象，当前不支持换装覆盖。' },
      voicePreset: 'female-soft',
      voiceRate: 0.98,
      voicePitch: 1.04,
      videoFit: 'contain',
      videoPosition: 'center center'
    },
    {
      id: 'yuanyao',
      name: '元瑶',
      short: '瑶',
      role: '少女形象 · 换装皮肤',
      type: 'JPG',
      render: 'static',
      desc: '离线稳定展示，支持星星、月光、阳光、云朵、校园、毛衣等图片换装。',
      source: '少女静态立绘',
      color: '#e8a0b4',
      model: 'assets/girl/initial.jpg',
      preview: 'assets/girl/initial.jpg',
      quality: 'high',
      outfitSupport: { clothes: true, accessories: true, appearance: true, reason: '元瑶支持静态皮肤预览，换装会直接切换图片。' },
      voicePreset: 'female-soft',
      voiceRate: 1.1,
      voicePitch: 1.15,
      staticFit: 'contain',
      staticPosition: 'center bottom',
      staticPadding: '18px',
      outfitImages: {
        default: 'assets/girl/initial.jpg',
        star: 'assets/girl/star.jpg',
        moon: 'assets/girl/moon.jpg',
        sun: 'assets/girl/sun.jpg',
        cloud: 'assets/girl/cloud.jpg',
        campus: 'assets/girl/campus.jpg',
        sweater: 'assets/girl/sweater.jpg',
        hat: 'assets/girl/hat.jpg',
        flower: 'assets/girl/flower.jpg'
      }
    },
    {
      id: 'yuanchu',
      name: '元初',
      short: '初',
      role: '静态兜底形象',
      type: 'PNG',
      render: 'static',
      desc: '不挑设备、不依赖动态模型的兜底形象，用于断网和低性能设备。',
      source: 'V1.6 离线兜底 · 静态形象',
      color: '#a8b8c4',
      model: 'assets/yuanchu-card.svg',
      preview: 'assets/yuanchu-card.svg',
      quality: 'stable',
      outfitSupport: { clothes: false, accessories: false, appearance: false, reason: '元初是兜底形象，用来保证任何设备都能显示。' },
      voicePreset: 'female-soft',
      voiceRate: 1.0,
      voicePitch: 1.0,
      staticFit: 'contain',
      staticPosition: 'center center',
      staticPadding: '58px'
    }
  ];

  window.NEUROMATE_AVATAR_KEY = 'neuromate-avatar-mode-v16';
  const LEGACY_AVATAR_KEYS = ['neuromate-avatar-mode-v15'];
  const DEFAULT_RESET_KEY = 'neuromate-avatar-default-v168';
  window.NEUROMATE_DEFAULT_AVATAR_ID = 'yuanan';
  window.NeuroMateAvatarRegistry = {
    all: window.NEUROMATE_SITE_AVATARS,
    get(id) {
      return window.NEUROMATE_SITE_AVATARS.find((avatar) => avatar.id === id)
        || window.NEUROMATE_SITE_AVATARS.find((avatar) => avatar.id === window.NEUROMATE_DEFAULT_AVATAR_ID)
        || window.NEUROMATE_SITE_AVATARS[0];
    },
    load() {
      try {
        if (!localStorage.getItem(DEFAULT_RESET_KEY)) {
          localStorage.setItem(window.NEUROMATE_AVATAR_KEY, window.NEUROMATE_DEFAULT_AVATAR_ID);
          localStorage.setItem(DEFAULT_RESET_KEY, 'done');
          return window.NEUROMATE_DEFAULT_AVATAR_ID;
        }
        let saved = localStorage.getItem(window.NEUROMATE_AVATAR_KEY);
        if (!saved) {
          saved = LEGACY_AVATAR_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
          if (saved) localStorage.setItem(window.NEUROMATE_AVATAR_KEY, saved);
        }
        const exists = window.NEUROMATE_SITE_AVATARS.some((avatar) => avatar.id === saved);
        if (exists) return saved;
        localStorage.setItem(window.NEUROMATE_AVATAR_KEY, window.NEUROMATE_DEFAULT_AVATAR_ID);
        return window.NEUROMATE_DEFAULT_AVATAR_ID;
      } catch (error) { return window.NEUROMATE_DEFAULT_AVATAR_ID; }
    },
    save(id) {
      try {
        const exists = window.NEUROMATE_SITE_AVATARS.some((avatar) => avatar.id === id);
        localStorage.setItem(window.NEUROMATE_AVATAR_KEY, exists ? id : window.NEUROMATE_DEFAULT_AVATAR_ID);
      } catch (error) { /* ignore */ }
    }
  };
})();
