// 元知己 V1.6 本地演示服务器（零依赖，node _local-server.js [端口]）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || 8321);
const OPEN_PAGE = process.argv[3] || 'index.html';
const ROOT = __dirname;
const apiRuntimeConfig = {
  baseUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  apiKey: '',
  source: 'v16-local-demo',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.vrm': 'model/gltf-binary',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res, payload, status = 200) {
  const data = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (error) { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function publicApiConfig() {
  return {
    baseUrl: apiRuntimeConfig.baseUrl,
    model: apiRuntimeConfig.model,
    configured: Boolean(apiRuntimeConfig.apiKey),
    source: apiRuntimeConfig.source,
  };
}

function validateApiConfig(incoming = {}) {
  const baseUrl = String(incoming.baseUrl || apiRuntimeConfig.baseUrl).trim();
  const model = String(incoming.model || apiRuntimeConfig.model).trim();
  const apiKey = String(incoming.apiKey || apiRuntimeConfig.apiKey || '').trim();
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid_base_url');
    if (parsed.username || parsed.password) throw new Error('invalid_base_url');
  } catch (error) {
    throw new Error('invalid_base_url');
  }
  if (!model || model.length > 120) throw new Error('invalid_model');
  return { baseUrl, model, apiKey, source: 'browser-form' };
}

function localReply(message, context = {}) {
  const text = String(message || '');
  const mood = String(context.mood || '平静');
  if (/累|疲惫|压力|焦虑|烦|难受|难过|哭/.test(text)) return '听起来你现在有点辛苦。先不用急着解决，我们先把呼吸放慢，我会陪你一点一点说。';
  if (/考试|作业|学习|复习/.test(text)) return '我们先把任务缩小，只看下一步。先做最容易开始的十分钟，做完再决定下一步。';
  if (/开心|高兴|好消息|完成|成功/.test(text)) return '这是值得被记住的好消息。谢谢你把它告诉我，今天可以给自己一点奖励。';
  return `我在认真听。现在是${mood}状态，我们可以慢慢把这件事说清楚。`;
}

function buildAgentAnalysis(body = {}) {
  const input = String(body.input || body.message || '');
  const scenario = String(body.scenario || 'exam');
  const crisis = /(不想活|自杀|伤害自己|结束生命|活着没意思|撑不下去)/.test(input);
  if (crisis) {
    return {
      outputs: {
        safety: '检测到可能涉及生命安全的表达，停止普通学习建议，优先连接现实支持。',
        scenario: '安全优先流程。',
        state: '用户可能处在高风险或极端痛苦状态，需要现实中的人立即介入。',
        cognition: '此时不做认知纠偏，先确认安全和陪伴。',
        memory: '本地演示不会上传隐私数据，仅保留当前页面状态。',
        action: '请尽快联系可信赖的人陪在身边，并联系学校心理中心或当地急救。'
      },
      result: {
        risk: '红色 / 需要现实支持',
        scenario: '安全优先流程',
        pattern: '高风险表达待人工确认',
        strategy: '停止普通干预 + 现实支持转介',
        avatar: '我很重视你刚才说的话。现在先不要一个人承受，请尽快联系一位可信赖的人陪在身边，并联系学校心理中心或当地急救。',
        actions: ['联系一位可信赖的人', '不要独处', '联系学校心理中心', '紧急情况下联系当地急救']
      },
      kb: {
        do: ['认真确认当下安全', '鼓励现实中的人立即介入'],
        avoid: ['不继续普通学习建议', '不承诺完全保密'],
        micro: ['联系可信赖的人', '前往有人陪伴的空间']
      },
      offline: true
    };
  }
  const preset = scenario === 'defense'
    ? {
        scenario: '答辩前 / 汇报前',
        pattern: '被评价焦虑',
        strategy: '身体稳定 + 答辩三件套',
        avatar: '答辩前紧张不代表你不行，而是你很在意结果。现在先不大改内容，我们只抓开场三十秒、项目亮点和三个可能追问。',
        actions: ['做三轮慢呼吸', '读一遍开场三十秒', '写下三个可能问题', '准备一句缓冲话术']
      }
    : scenario === 'fatigue'
      ? {
          scenario: '连续学习后 / 疲劳透支',
          pattern: '低效率硬撑',
          strategy: '停止加码 + 能量恢复',
          avatar: '现在看不进去不是意志力差，而是大脑需要恢复。先离开屏幕五分钟，喝水、活动肩颈，回来后只整理三道错题。',
          actions: ['离开屏幕五分钟', '喝水并活动肩颈', '只整理三道错题', '设定结束学习时间']
        }
      : {
          scenario: '考试周 / 期末周',
          pattern: '任务过载 + 时间压力',
          strategy: '最近考试优先 + 最小任务拆解',
          avatar: '考试周任务堆在一起，慌是很正常的。我们先不处理全部科目，只处理最近一门：今晚先复习最可能考的重点，再做二十分钟错题。',
          actions: ['列出最近一门考试', '选一个高频重点章节', '做二十分钟错题', '站起来活动五分钟']
        };
  return {
    outputs: {
      safety: '未发现自伤或极端绝望表达，可以进入普通压力支持流程。',
      scenario: `命中${preset.scenario}场景，本地 Agent 接口已返回可演示结果。`,
      state: '压力偏高，但仍适合用拆解任务和稳定节奏来恢复掌控感。',
      cognition: '核心困扰更接近任务过载或评价焦虑，不是能力不足。',
      memory: '本地演示不会上传隐私数据；接口接入后可替换为真实记忆画像。',
      action: preset.actions.join('；')
    },
    result: {
      risk: scenario === 'defense' ? '黄色' : '绿色 / 黄色边界',
      ...preset
    },
    kb: {
      do: ['承认压力真实存在', '把计划压缩到一至三个任务'],
      avoid: ['不一次塞满整周计划', '不把熬夜包装成努力'],
      micro: preset.actions.slice(0, 3)
    },
    offline: true
  };
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/health' && req.method === 'GET') {
    return sendJson(res, { ok: true, apiConfigured: Boolean(apiRuntimeConfig.apiKey), model: apiRuntimeConfig.model });
  }
  if (p === '/api/config' && req.method === 'GET') {
    return sendJson(res, publicApiConfig());
  }
  if (p === '/api/config' && req.method === 'POST') {
    return readJson(req)
      .then(body => {
        Object.assign(apiRuntimeConfig, validateApiConfig(body));
        sendJson(res, { ok: true, ...publicApiConfig() });
      })
      .catch(error => sendJson(res, { error: error.message || 'config_error' }, 400));
  }
  if (p === '/api/config/test' && req.method === 'POST') {
    return readJson(req)
      .then(body => {
        const config = validateApiConfig(body);
        if (!config.apiKey) return sendJson(res, { error: 'api_key_required' }, 400);
        sendJson(res, { ok: true, model: config.model, latencyMs: 1, reply: 'OK' });
      })
      .catch(error => sendJson(res, { error: error.message || 'config_test_error' }, 400));
  }
  if (p === '/api/chat' && req.method === 'POST') {
    return readJson(req)
      .then(body => sendJson(res, {
        reply: localReply(body.message, body.context || {}),
        mode: 'local-fallback',
        model: apiRuntimeConfig.model,
        fallbackReason: apiRuntimeConfig.apiKey ? 'v16_static_server_demo' : 'api_not_configured',
      }))
      .catch(error => sendJson(res, { error: error.message || 'chat_error' }, 400));
  }
  if (p === '/api/agent-cluster/analyze' && req.method === 'POST') {
    return readJson(req)
      .then(body => sendJson(res, {
        ok: true,
        mode: 'local-agent-fallback',
        data: buildAgentAnalysis(body),
      }))
      .catch(error => sendJson(res, { error: error.message || 'agent_error' }, 400));
  }
  if (p === '/') p = '/' + OPEN_PAGE;
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found: ' + p); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('元知己本地服务器已启动: http://localhost:' + PORT + '/');
  console.log('关闭此窗口即可停止服务器。');
});
