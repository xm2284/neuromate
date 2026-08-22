(function () {
  'use strict';

  const KEY = 'neuromate-api-config-v16';
  const LEGACY_KEYS = ['neuromate-api-config-v15'];
  const defaults = {
    profile: 'recommended',
    httpEndpoint: '',
    wsEndpoint: '',
    apiKey: '',
    model: 'gpt-4o-mini',
    voicePreset: 'female-soft',
    rate: '0.85',
    pitch: '1.0'
  };

  function load() {
    try {
      let raw = localStorage.getItem(KEY);
      if (!raw) {
        raw = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
        if (raw) localStorage.setItem(KEY, raw);
      }
      return { ...defaults, ...(JSON.parse(raw) || {}) };
    } catch (error) {
      return { ...defaults };
    }
  }

  function save(config) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...defaults, ...config })); } catch (error) { /* ignore */ }
  }

  function headers(config) {
    const base = { 'Content-Type': 'application/json' };
    if (config.apiKey) base.Authorization = `Bearer ${config.apiKey}`;
    return base;
  }

  const config = load();
  window.NEUROMATE_API_CONFIG = config;
  window.NEUROMATE_LLM_ENDPOINT = config.httpEndpoint || '';
  window.NEUROMATE_VTUBER_WS = config.wsEndpoint || '';
  window.NEUROMATE_VOICE_PRESET = config.voicePreset || defaults.voicePreset;
  window.NEUROMATE_VOICE_RATE = Number(config.rate || defaults.rate);
  window.NEUROMATE_VOICE_PITCH = Number(config.pitch || defaults.pitch);

  window.NeuroMateApiConfig = {
    key: KEY,
    defaults,
    load,
    save(configPatch) {
      const next = { ...load(), ...configPatch };
      save(next);
      window.NEUROMATE_API_CONFIG = next;
      window.NEUROMATE_LLM_ENDPOINT = next.httpEndpoint || '';
      window.NEUROMATE_VTUBER_WS = next.wsEndpoint || '';
      window.NEUROMATE_VOICE_PRESET = next.voicePreset || defaults.voicePreset;
      window.NEUROMATE_VOICE_RATE = Number(next.rate || defaults.rate);
      window.NEUROMATE_VOICE_PITCH = Number(next.pitch || defaults.pitch);
      return next;
    },
    async testHTTP(message = '请用一句话回复：连接测试成功') {
      const now = load();
      if (!now.httpEndpoint) throw new Error('还没有填写 HTTP 接口地址');
      const response = await fetch(now.httpEndpoint, {
        method: 'POST',
        headers: headers(now),
        body: JSON.stringify({
          message,
          model: now.model,
          messages: [{ role: 'user', content: message }],
          context: { source: 'neuromate-api-config' }
        })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}：${text.slice(0, 120) || '接口未返回内容'}`);
      try {
        const json = JSON.parse(text);
        return json.reply || json.message || json.content || json.choices?.[0]?.message?.content || text;
      } catch (error) {
        return text || '接口已响应';
      }
    },
    testWS(timeout = 3500) {
      const now = load();
      if (!now.wsEndpoint) return Promise.reject(new Error('还没有填写 WebSocket 地址'));
      return new Promise((resolve, reject) => {
        let done = false;
        const socket = new WebSocket(now.wsEndpoint);
        const timer = window.setTimeout(() => {
          if (done) return;
          done = true;
          try { socket.close(); } catch (error) { /* ignore */ }
          reject(new Error('WebSocket 连接超时'));
        }, timeout);
        socket.addEventListener('open', () => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          socket.close();
          resolve('WebSocket 已连通');
        });
        socket.addEventListener('error', () => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          reject(new Error('WebSocket 连接失败'));
        });
      });
    }
  };
})();
