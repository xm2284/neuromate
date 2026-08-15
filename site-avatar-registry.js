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
      preview: 'assets/yuanchu-card.svg',
      voicePreset: 'female-soft'
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
      voicePreset: 'female-warm'
    },
    {
      id: 'yuanxi',
      name: '元熙',
      short: '熙',
      role: '3D 数字人',
      type: 'VRM',
      render: 'vrm',
      desc: '3D 数字人分支，适合承接语音页、VRM 换装和小舟/爱丽丝皮肤。',
      source: 'AvatarSample_A VRM',
      color: '#8ba6ae',
      model: 'models/AvatarSample_A.vrm',
      preview: 'assets/yuanchu-card.svg',
      voicePreset: 'female-soft'
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
      voicePreset: 'male-gentle'
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
      voicePreset: 'female-warm'
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
      voicePreset: 'female-soft'
    },
    {
      id: 'yuanchu',
      name: '元初',
      short: '初',
      role: '静态兜底形象',
      type: 'PNG',
      render: 'static',
      desc: '不挑设备、不依赖动态模型的兜底形象，用于断网和低性能设备。',
      source: 'V1.4 基线 · 静态形象',
      color: '#a8b8c4',
      model: 'assets/yuanchu-card.svg',
      preview: 'assets/yuanchu-card.svg',
      voicePreset: 'female-soft'
    }
  ];

  window.NEUROMATE_AVATAR_KEY = 'neuromate-avatar-mode-v15';
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
        const saved = localStorage.getItem(window.NEUROMATE_AVATAR_KEY);
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
