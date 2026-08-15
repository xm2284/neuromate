// 元知己 V1.4 本地演示服务器（零依赖，node _local-server.js [端口]）
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
  source: 'v15-local-demo',
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
        fallbackReason: apiRuntimeConfig.apiKey ? 'v15_static_server_demo' : 'api_not_configured',
      }))
      .catch(error => sendJson(res, { error: error.message || 'chat_error' }, 400));
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
