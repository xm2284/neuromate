import * as THREE from './integrations/digital-human-demo/js/three/three.module.js';
import { GLTFLoader } from './integrations/digital-human-demo/js/three/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from './integrations/digital-human-demo/js/three/three-vrm.module.min.js';

const registry = window.NeuroMateAvatarRegistry;
const live2dHost = document.querySelector('#companionLive2DStage');
const vrmHost = document.querySelector('#companionVRMStage');
const videoEl = document.querySelector('#companionVideoStage');
const staticEl = document.querySelector('#companionStaticStage');
const loadingEl = document.querySelector('#companionRenderLoading');

let live2dApp = null;
let live2dCleanup = null;
let vrmRenderer = null;
let vrmScene = null;
let vrmRAF = 0;
let vrmCleanup = null;
let currentAvatarId = '';
let switchSeq = 0;
let speaking = false;
let mood = loadMood();
const LIVE2D_LAYOUTS = {
  yuanan: { h: 1.12, w: 1.02, y: 1.06 },
  yuanqing: { h: 1.06, w: 0.96, y: 1.03 },
  yuanche: { h: 1.16, w: 1.06, y: 1.08 },
  mao: { h: 0.92, w: 0.86, y: 1.0 }
};

function allLayers() {
  return [live2dHost, vrmHost, videoEl, staticEl].filter(Boolean);
}

function setLoading(text, show = true) {
  if (!loadingEl) return;
  loadingEl.textContent = text || '正在加载数字人…';
  loadingEl.hidden = !show;
}

function showLayer(type) {
  if (live2dHost) live2dHost.hidden = type !== 'live2d';
  if (vrmHost) vrmHost.hidden = type !== 'vrm';
  if (videoEl) videoEl.hidden = type !== 'video';
  if (staticEl) staticEl.hidden = type !== 'static';
}

function loadMood() {
  try {
    return JSON.parse(localStorage.getItem('neuromate-companion-render-state') || '{}').mood || document.body.dataset.mood || 'calm';
  } catch (error) {
    return document.body.dataset.mood || 'calm';
  }
}

function saveMood(nextMood) {
  mood = nextMood || 'calm';
  try {
    const saved = JSON.parse(localStorage.getItem('neuromate-companion-render-state') || '{}');
    localStorage.setItem('neuromate-companion-render-state', JSON.stringify({ ...saved, mood }));
  } catch (error) {
    /* ignore */
  }
}

function mouthPower() {
  return ({ calm: 0.62, joy: 0.86, warm: 0.72, focus: 0.58, anxious: 0.52, tired: 0.46 }[mood] || 0.62);
}

function disposeLive2D() {
  if (live2dCleanup) {
    try { live2dCleanup(); } catch (error) { /* ignore */ }
    live2dCleanup = null;
  }
  if (live2dApp) {
    try { live2dApp.destroy(true); } catch (error) { /* ignore */ }
    live2dApp = null;
  }
  if (live2dHost) live2dHost.replaceChildren();
}

function disposeVRM() {
  if (vrmCleanup) {
    try { vrmCleanup(); } catch (error) { /* ignore */ }
    vrmCleanup = null;
  }
  if (vrmRAF) cancelAnimationFrame(vrmRAF);
  vrmRAF = 0;
  if (vrmRenderer) {
    if (vrmScene) {
      vrmScene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.filter(Boolean).forEach((material) => {
          Object.values(material).forEach((value) => value?.isTexture && value.dispose?.());
          material.dispose?.();
        });
      });
    }
    try { vrmRenderer.dispose(); } catch (error) { /* ignore */ }
  }
  vrmRenderer = null;
  vrmScene = null;
  if (vrmHost) vrmHost.replaceChildren();
}

function disposeVideo() {
  if (!videoEl) return;
  videoEl.pause();
  videoEl.removeAttribute('src');
  try { videoEl.load(); } catch (error) { /* ignore */ }
}

function disposeDynamic() {
  disposeLive2D();
  disposeVRM();
  disposeVideo();
}

function resolveStaticSrc(avatar) {
  return avatar.preview || avatar.model || 'assets/yuanchu-card.svg';
}

async function loadStatic(avatar) {
  if (!staticEl) return;
  staticEl.src = resolveStaticSrc(avatar);
  staticEl.alt = `${avatar.name}静态形象`;
}

async function loadVideo(avatar, requestId) {
  if (!videoEl) return;
  videoEl.src = avatar.model;
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.playsInline = true;
  await new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('video_load_failed')); };
    const cleanup = () => {
      videoEl.removeEventListener('canplay', done);
      videoEl.removeEventListener('error', fail);
    };
    videoEl.addEventListener('canplay', done, { once: true });
    videoEl.addEventListener('error', fail, { once: true });
    videoEl.load();
  });
  if (requestId !== switchSeq) return;
  try { await videoEl.play(); } catch (error) { /* autoplay may be blocked */ }
}

async function loadLive2D(avatar, requestId) {
  if (!live2dHost || !window.PIXI?.live2d) throw new Error('live2d_runtime_missing');
  const app = new PIXI.Application({
    backgroundAlpha: 0,
    resizeTo: live2dHost,
    antialias: true,
  });
  live2dApp = app;
  live2dHost.appendChild(app.view);

  const urls = avatar.fallback || [avatar.model];
  let model = null;
  for (const url of urls) {
    try {
      model = await PIXI.live2d.Live2DModel.from(url);
      break;
    } catch (error) {
      console.warn('Live2D 模型加载失败，尝试下一个来源：', url, error);
    }
  }
  if (!model) throw new Error('live2d_load_failed');
  if (requestId !== switchSeq) {
    try { model.destroy(); } catch (error) { /* ignore */ }
    return;
  }

  const baseWidth = model.width || 1;
  const baseHeight = model.height || 1;
  model.anchor.set(0.5, 1);
  const layout = () => {
    const w = live2dHost.clientWidth || 1;
    const h = live2dHost.clientHeight || 1;
    const view = LIVE2D_LAYOUTS[avatar.id] || { h: 1.04, w: 1.02, y: 1.03 };
    const scale = Math.min((h * view.h) / baseHeight, (w * view.w) / baseWidth);
    model.scale.set(scale);
    model.x = w / 2;
    model.y = h * view.y;
  };
  app.stage.addChild(model);
  layout();
  window.addEventListener('resize', layout);

  const mouthIds = ['ParamMouthOpenY', 'PARAM_MOUTH_OPEN_Y'];
  app.ticker.add(() => {
    if (!model) return;
    const value = speaking ? Math.abs(Math.sin(performance.now() / 95)) * mouthPower() : 0;
    try {
      const core = model.internalModel.coreModel;
      mouthIds.forEach((id) => {
        try { core.setParameterValueById(id, value); } catch (error) { /* ignore */ }
      });
    } catch (error) {
      /* ignore */
    }
  });

  const idle = window.setInterval(() => {
    if (speaking || !model) return;
    try {
      const groups = Object.keys(model.internalModel.settings.motions || {});
      const hit = groups.includes('TapBody') ? 'TapBody' : groups.includes('tap_body') ? 'tap_body' : null;
      if (hit) model.motion(hit);
    } catch (error) {
      /* ignore */
    }
  }, 12000);

  live2dCleanup = () => {
    window.removeEventListener('resize', layout);
    window.clearInterval(idle);
    model = null;
  };
}

async function loadVRM(avatar, requestId) {
  if (!vrmHost) return;
  const canvas = document.createElement('canvas');
  vrmHost.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0, 1.08, 2.85);
  camera.lookAt(0, 0.96, 0);
  scene.add(new THREE.HemisphereLight(0xf4faf6, 0x60716b, 2.15));
  const key = new THREE.DirectionalLight(0xfff2dd, 3);
  key.position.set(2.4, 3.6, 3.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9deda, 1.6);
  fill.position.set(-3, 2.1, 2.2);
  scene.add(fill);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const loaded = await new Promise((resolve, reject) => {
    loader.load(avatar.model, (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.rotateVRM0(vrm);
      if (requestId !== switchSeq) return reject(new Error('avatar_switch_cancelled'));
      scene.add(vrm.scene);
      resolve(vrm);
    }, undefined, reject);
  });

  const resize = () => {
    const w = vrmHost.clientWidth || 1;
    const h = vrmHost.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(vrmHost);

  const clock = new THREE.Clock();
  let elapsed = 0;
  let blinkTimer = 1.2;
  let blinkPhase = 0;
  const animate = () => {
    vrmRAF = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    const em = loaded.expressionManager;
    if (em) {
      blinkTimer -= delta;
      if (blinkTimer <= 0) {
        blinkPhase += delta * 14;
        em.setValue('blink', Math.sin(Math.min(Math.PI, blinkPhase * Math.PI)));
        if (blinkPhase >= 1) {
          em.setValue('blink', 0);
          blinkPhase = 0;
          blinkTimer = 2.4 + Math.random() * 2.6;
        }
      }
      em.setValue('aa', speaking ? 0.18 + Math.abs(Math.sin(elapsed * 12)) * mouthPower() : 0);
    }
    const head = loaded.humanoid.getNormalizedBoneNode('head');
    const chest = loaded.humanoid.getNormalizedBoneNode('chest');
    if (head) {
      head.rotation.y = Math.sin(elapsed * 0.42) * 0.035;
      head.rotation.x = Math.sin(elapsed * 0.31) * 0.018;
    }
    if (chest) chest.rotation.z = Math.sin(elapsed * 0.82) * (speaking ? 0.012 : 0.006);
    loaded.scene.position.y = Math.sin(elapsed * 1.05) * 0.008;
    loaded.update(delta);
    renderer.render(scene, camera);
  };
  animate();
  vrmRenderer = renderer;
  vrmScene = scene;
  vrmCleanup = () => resizeObserver.disconnect();
}

async function switchAvatar(id) {
  const avatar = registry?.get(id || registry.load());
  if (!avatar || !live2dHost) return;
  currentAvatarId = avatar.id;
  const requestId = ++switchSeq;
  setLoading(`正在加载 ${avatar.name}…`, true);
  disposeDynamic();

  try {
    if (avatar.render === 'live2d') {
      showLayer('live2d');
      await loadLive2D(avatar, requestId);
    } else if (avatar.render === 'vrm') {
      showLayer('vrm');
      await loadVRM(avatar, requestId);
    } else if (avatar.render === 'video') {
      showLayer('video');
      await loadVideo(avatar, requestId);
    } else {
      showLayer('static');
      await loadStatic(avatar);
    }
    if (requestId === switchSeq) setLoading('', false);
  } catch (error) {
    console.warn('陪伴页动态形象加载失败，切换静态兜底：', error);
    if (requestId !== switchSeq) return;
    showLayer('static');
    await loadStatic({ ...avatar, preview: avatar.preview || 'assets/yuanchu-card.svg' });
    setLoading('动态模型暂不可用，已显示兜底形象', true);
    window.setTimeout(() => setLoading('', false), 1800);
  }
}

function setSpeaking(value, duration = 0) {
  speaking = Boolean(value);
  if (speaking && duration > 0) {
    window.clearTimeout(setSpeaking.timer);
    setSpeaking.timer = window.setTimeout(() => { speaking = false; }, duration);
  }
}

function pulse(text = '') {
  const duration = Math.max(1100, Math.min(5200, String(text).length * 90));
  setSpeaking(true, duration);
}

function syncOutfit() {
  try {
    const snapshot = JSON.parse(localStorage.getItem('neuromate-custom-space-v1') || '{}');
    document.body.dataset.rendererOutfit = snapshot?.equipped?.clothes || 'star';
  } catch (error) {
    document.body.dataset.rendererOutfit = 'star';
  }
}

window.NeuroMateCompanionRenderer = {
  switchAvatar,
  setSpeaking,
  pulse,
  setMood: saveMood,
  syncOutfit,
  current() { return currentAvatarId; },
};

window.addEventListener('neuromate:avatar-change', (event) => switchAvatar(event.detail?.id));
window.addEventListener('neuromate:mood-change', (event) => saveMood(event.detail?.mood));
window.addEventListener('neuromate:speaking', (event) => pulse(event.detail?.text || ''));
window.addEventListener('storage', (event) => {
  if (event.key === 'neuromate-avatar-mode-v15') switchAvatar(registry?.load());
  if (event.key === 'neuromate-custom-space-v1') syncOutfit();
  if (event.key === 'neuromate-companion-render-state') mood = loadMood();
});

allLayers().forEach((layer) => { if (layer) layer.hidden = true; });
syncOutfit();
switchAvatar(registry?.load() || 'yuanan');
