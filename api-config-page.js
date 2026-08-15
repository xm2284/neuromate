(function () {
  'use strict';

  const helper = window.NeuroMateApiConfig;
  const form = document.querySelector('#apiForm');
  const toast = document.querySelector('#toast');
  const result = document.querySelector('#testResult');
  const fields = {
    profile: document.querySelector('#profile'),
    httpEndpoint: document.querySelector('#httpEndpoint'),
    wsEndpoint: document.querySelector('#wsEndpoint'),
    apiKey: document.querySelector('#apiKey'),
    model: document.querySelector('#model'),
    rate: document.querySelector('#rate'),
    pitch: document.querySelector('#pitch')
  };
  const rateValue = document.querySelector('#rateValue');
  const pitchValue = document.querySelector('#pitchValue');
  let voicePreset = 'female-soft';
  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function render(config) {
    Object.keys(fields).forEach((key) => {
      if (fields[key] && config[key] !== undefined) fields[key].value = config[key];
    });
    voicePreset = config.voicePreset || 'female-soft';
    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.classList.toggle('active', button.dataset.preset === voicePreset);
    });
    rateValue.textContent = Number(fields.rate.value).toFixed(2);
    pitchValue.textContent = Number(fields.pitch.value).toFixed(2);
  }

  function collect() {
    return {
      profile: fields.profile.value,
      httpEndpoint: fields.httpEndpoint.value.trim(),
      wsEndpoint: fields.wsEndpoint.value.trim(),
      apiKey: fields.apiKey.value.trim(),
      model: fields.model.value.trim() || helper.defaults.model,
      voicePreset,
      rate: fields.rate.value,
      pitch: fields.pitch.value
    };
  }

  function save(message = '配置已保存并同步到本机浏览器。') {
    const next = helper.save(collect());
    render(next);
    showToast(message);
    return next;
  }

  function setResult(text, state) {
    result.textContent = text;
    result.classList.toggle('ok', state === 'ok');
    result.classList.toggle('fail', state === 'fail');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });

  document.querySelector('#resetConfig').addEventListener('click', () => {
    helper.save(helper.defaults);
    render(helper.defaults);
    showToast('已恢复默认配置。');
  });

  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      voicePreset = button.dataset.preset;
      document.querySelectorAll('[data-preset]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      save('音色预设已同步。');
    });
  });

  fields.rate.addEventListener('input', () => {
    rateValue.textContent = Number(fields.rate.value).toFixed(2);
    save('语速已同步。');
  });
  fields.pitch.addEventListener('input', () => {
    pitchValue.textContent = Number(fields.pitch.value).toFixed(2);
    save('音调已同步。');
  });

  document.querySelector('#voicePreview').addEventListener('click', () => {
    save('正在试听当前音色。');
    if (!window.speechSynthesis) {
      showToast('当前浏览器不支持语音试听。');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('你好，我是元知己。这个音色会同步到语音谈心页。');
    utterance.lang = 'zh-CN';
    utterance.rate = Number(fields.rate.value);
    utterance.pitch = Number(fields.pitch.value);
    const voices = window.speechSynthesis.getVoices();
    const chinese = voices.find((voice) => /^zh/.test(voice.lang));
    if (chinese) utterance.voice = chinese;
    window.speechSynthesis.speak(utterance);
  });

  document.querySelector('#testHTTP').addEventListener('click', async () => {
    save('已保存，正在测试 HTTP。');
    setResult('正在测试 HTTP 接口……', '');
    try {
      const reply = await helper.testHTTP(document.querySelector('#testMessage').value.trim());
      setResult(`HTTP 连接成功：\n${reply}`, 'ok');
    } catch (error) {
      setResult(`HTTP 测试失败：${error.message}\n\n如果只是做演示，可以留空接口，页面会自动使用本地回应。`, 'fail');
    }
  });

  document.querySelector('#testWS').addEventListener('click', async () => {
    save('已保存，正在测试 WebSocket。');
    setResult('正在测试 WebSocket……', '');
    try {
      const reply = await helper.testWS();
      setResult(reply, 'ok');
    } catch (error) {
      setResult(`WebSocket 测试失败：${error.message}\n\n请确认 Open-LLM-VTuber 后端已启动，且地址类似 ws://127.0.0.1:12393/client-ws。`, 'fail');
    }
  });

  render(helper.load());
})();
