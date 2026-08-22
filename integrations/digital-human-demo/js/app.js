/* ============================================================
 * 元知己 · 数字人形象切换 Demo 主逻辑
 * 功能：形象切换 / Live2D+VRM+视频+静态 四渲染器 / 对话 / TTS / 口型 / V1.6 装扮与状态联动
 * 技术栈：pixi-live2d-display（Live2D）+ three.js/three-vrm（VRM）
 * ============================================================ */
import * as THREE from "./three/three.module.js";
import { GLTFLoader } from "./three/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "./three/three-vrm.module.min.js";

const AVATARS = window.NEUROMATE_AVATARS;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let currentIndex = 0;          // 当前形象下标
let live2dApp = null;          // PIXI 实例
let vrmRenderer = null;        // three WebGLRenderer
let vrmScene = null;
let vrmCamera = null;
let vrm = null;
let vrmClock = null;
let vrmRAF = 0;
let speaking = false;
let voiceOn = true;
let moodIndex = 0;
let live2dCleanup = null;
let vrmCleanup = null;
let avatarSwitchSeq = 0;
let availableVoices = [];
const chatHistory = [];

const SITE_AVATAR_KEY = "neuromate-avatar-mode-v16";
const LEGACY_SITE_AVATAR_KEY = "neuromate-avatar-mode-v15";
const STORAGE_KEY = "neuromate-v16-demo-state";
const LEGACY_STORAGE_KEY = "neuromate-v15-demo-state";
const DEFAULT_STATE = {
  mood: "calm",
  outfit: "base",
  stars: 1200,
  unlocked: ["base", "star-bow", "room-aura", "xiaozhou", "alice", "quiet-drop", "panda-leaf", "status-lip"],
  quiet: false,
  memory: {
    focus: "",
    preference: "温和回应",
    count: 0
  }
};
const MOODS = [
  { id: "calm", label: "平静", color: "#7499a8", rate: 0.92, pitch: 1.0, mouth: 0.72, caption: "平静模式 · 我在这里，先慢慢说一点点就好。" },
  { id: "anxious", label: "焦虑", color: "#c78668", rate: 0.86, pitch: 0.98, mouth: 0.58, caption: "焦虑模式 · 我们把事情放慢，先找眼前最小的一步。" },
  { id: "tired", label: "疲惫", color: "#9a8caa", rate: 0.82, pitch: 0.92, mouth: 0.5, caption: "疲惫模式 · 先不用继续加码，给身体留一点恢复空间。" },
  { id: "joy", label: "愉悦", color: "#c19b62", rate: 1.02, pitch: 1.08, mouth: 0.86, caption: "愉悦模式 · 这是值得被记住的好消息。" },
  { id: "focus", label: "专注", color: "#649a78", rate: 0.9, pitch: 0.96, mouth: 0.64, caption: "专注模式 · 我们先把注意力放回当下这一步。" }
];
const OUTFITS = [
  { id: "base", name: "基础陪伴装", price: 0, avatars: "all", source: "默认装扮", desc: "所有形象可用" },
  { id: "star-bow", name: "星星发夹", price: 0, avatars: ["yuanan", "yuanqing", "yuanchu"], source: "轻量配饰", desc: "轻量配饰" },
  { id: "room-aura", name: "心情光环", price: 0, avatars: "all", source: "状态联动", desc: "随状态变色" },
  { id: "xiaozhou", name: "小舟皮肤", price: 0, avatars: ["yuanxi"], source: "元熙专属", desc: "3D 皮肤位" },
  { id: "alice", name: "爱丽丝皮肤", price: 0, avatars: ["yuanxi"], source: "元熙专属", desc: "3D 皮肤位" },
  { id: "quiet-drop", name: "心湖水滴", price: 0, avatars: "all", source: "安静陪伴", desc: "低刺激模式" },
  { id: "panda-leaf", name: "熊猫竹叶", price: 0, avatars: ["panda"], source: "视频形象配饰", desc: "视频形象配饰" },
  { id: "status-lip", name: "状态口型", price: 0, avatars: "all", source: "状态口型", desc: "情绪表现层" }
];
const LIVE2D_LAYOUTS = {
  yuanan: { h: 1.12, w: 1.02, y: 1.06 },
  yuanqing: { h: 1.06, w: 0.96, y: 1.03 },
  yuanche: { h: 1.16, w: 1.06, y: 1.08 },
  mao: { h: 0.92, w: 0.86, y: 1.0 }
};

let demoState = loadDemoState();

function loadDemoState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) localStorage.setItem(STORAGE_KEY, raw);
    }
    const saved = JSON.parse(raw || "{}");
    return {
      ...DEFAULT_STATE,
      ...saved,
      unlocked: Array.isArray(saved.unlocked) ? Array.from(new Set(["base", "quiet-drop", ...saved.unlocked])) : DEFAULT_STATE.unlocked.slice(),
      memory: { ...DEFAULT_STATE.memory, ...(saved.memory || {}) }
    };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function saveDemoState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demoState));
}

function moodById(id = demoState.mood) {
  return MOODS.find((mood) => mood.id === id) || MOODS[0];
}

function outfitById(id = demoState.outfit) {
  return OUTFITS.find((outfit) => outfit.id === id) || OUTFITS[0];
}

/* ---------------- 舞台切换 ---------------- */
const stageEl = $("#live2d-stage");
const vrmStageEl = $("#vrm-stage");
const videoStageEl = $("#video-stage");
const videoEl = $("#video-avatar");
const staticStageEl = $("#static-stage");
const loadingTip = $("#loadingTip");

function setLoading(text, show) {
  loadingTip.textContent = text || "正在加载数字人…";
  loadingTip.classList.toggle("show", Boolean(show));
}

function showStage(type) {
  stageEl.style.display = type === "live2d" ? "block" : "none";
  vrmStageEl.style.display = type === "vrm" ? "block" : "none";
  videoStageEl.style.display = type === "video" ? "flex" : "none";
  staticStageEl.style.display = type === "static" ? "flex" : "none";
}

function supportsOutfit(outfit, avatar = AVATARS[currentIndex]) {
  if (outfit.avatars === "all") return true;
  return Array.isArray(outfit.avatars) && outfit.avatars.includes(avatar?.id);
}

function isUnlocked(outfitId) {
  return true;
}

function setMood(id, { speakLine = false } = {}) {
  const mood = moodById(id);
  demoState.mood = mood.id;
  saveDemoState();
  document.body.dataset.mood = mood.id;
  document.documentElement.style.setProperty("--mood-accent", mood.color);
  document.documentElement.style.setProperty("--mood-soft", `${mood.color}2b`);
  $("#moodName").textContent = mood.label;
  $("#stageCaption").textContent = mood.caption;
  $$("#moodButtons button").forEach((button) => button.classList.toggle("is-active", button.dataset.mood === mood.id));
  if (speakLine) {
    addMsg(mood.caption.replace(/^.+?·\s*/, ""), "avatar");
  }
}

function setOutfit(id, { notify = true } = {}) {
  const outfit = outfitById(id);
  const avatar = AVATARS[currentIndex];
  if (!supportsOutfit(outfit, avatar)) {
    if (notify) addMsg(`${outfit.name} 暂时不适合 ${avatar.name}，我先保留当前装扮。`, "avatar");
    return;
  }
  if (!demoState.unlocked.includes(outfit.id)) demoState.unlocked.push(outfit.id);
  demoState.outfit = outfit.id;
  saveDemoState();
  updateOutfitBadge();
  renderOutfits();
  if (notify) {
    addMsg(`已穿戴：${outfit.name}。`, "avatar");
    if (outfit.id === "quiet-drop") toggleQuiet(true);
  }
}

function updateOutfitBadge() {
  const outfit = outfitById();
  $("#outfitBadge").innerHTML = `<strong>当前装扮：${outfit.name}</strong><small>${outfit.desc} · ${outfit.source}</small>`;
  $("#starBalance").textContent = `星贝 ${demoState.stars}`;
}

function renderMoodButtons() {
  const wrap = $("#moodButtons");
  wrap.innerHTML = "";
  MOODS.forEach((mood) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mood = mood.id;
    button.textContent = mood.label;
    button.addEventListener("click", () => setMood(mood.id, { speakLine: true }));
    wrap.appendChild(button);
  });
}

function renderOutfits() {
  const wrap = $("#outfitList");
  const avatar = AVATARS[currentIndex];
  wrap.innerHTML = "";
  OUTFITS.filter((outfit) => supportsOutfit(outfit, avatar)).forEach((outfit) => {
    const unlocked = isUnlocked(outfit.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "outfit-card" + (demoState.outfit === outfit.id ? " is-active" : "");
    card.dataset.locked = "false";
    card.innerHTML = `<strong>${outfit.name}</strong><small>免费可用 · ${outfit.desc}</small>`;
    card.addEventListener("click", () => setOutfit(outfit.id));
    wrap.appendChild(card);
  });
  updateOutfitBadge();
}

function toggleQuiet(force) {
  demoState.quiet = typeof force === "boolean" ? force : !demoState.quiet;
  saveDemoState();
  document.body.classList.toggle("is-quiet", demoState.quiet);
  $("#quietStatus").textContent = demoState.quiet ? "安静模式" : "普通模式";
  $("#btnQuiet").classList.toggle("is-active", demoState.quiet);
  $("#stageCaption").textContent = demoState.quiet
    ? "安静陪伴 · 我先退回水滴里，需要时再轻轻唤醒。"
    : moodById().caption;
}

function inferMoodAndFocus(text) {
  if (/累|疲惫|没力气|撑不住/.test(text)) return { mood: "tired", focus: "疲惫和恢复" };
  if (/焦虑|紧张|担心|害怕|慌|压力/.test(text)) return { mood: "anxious", focus: "压力和焦虑" };
  if (/完成|开心|高兴|成功|好消息/.test(text)) return { mood: "joy", focus: "正向事件" };
  if (/考试|作业|学习|复习/.test(text)) return { mood: "focus", focus: "学习和考试" };
  if (/睡|失眠|睡不着/.test(text)) return { mood: "calm", focus: "睡眠" };
  return { mood: demoState.mood, focus: demoState.memory.focus || "日常陪伴" };
}

function updateMemory(text, replyMood) {
  const inferred = inferMoodAndFocus(text);
  demoState.memory.count += 1;
  demoState.memory.focus = inferred.focus;
  if (/不想说|安静|别问/.test(text)) demoState.memory.preference = "少追问，陪着就好";
  saveDemoState();
  $("#memoryCard").innerHTML = `<strong>本地记忆：</strong>最近关注「${demoState.memory.focus}」，偏好「${demoState.memory.preference}」，已聊 ${demoState.memory.count} 次。`;
  if (replyMood) setMood(replyMood);
}

function initV15Panel() {
  renderMoodButtons();
  setMood(demoState.mood);
  toggleQuiet(demoState.quiet);
  renderOutfits();
  $("#memoryCard").innerHTML = demoState.memory.focus
    ? `<strong>本地记忆：</strong>最近关注「${demoState.memory.focus}」，偏好「${demoState.memory.preference}」，已聊 ${demoState.memory.count} 次。`
    : "<strong>本地记忆：</strong>还没有新的关注点。";
}

function disposeAll() {
  if (live2dCleanup) {
    try { live2dCleanup(); } catch (e) {}
    live2dCleanup = null;
  }
  if (vrmCleanup) {
    try { vrmCleanup(); } catch (e) {}
    vrmCleanup = null;
  }
  // 销毁 Live2D
  if (live2dApp) {
    try { live2dApp.destroy(true); } catch (e) {}
    live2dApp = null;
  }
  stageEl.innerHTML = "";
  // 销毁 VRM
  if (vrmRenderer) {
    cancelAnimationFrame(vrmRAF);
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
    try { vrmRenderer.dispose(); } catch (e) {}
    vrmRenderer = null;
    vrmScene = null;
    vrmCamera = null;
    vrmClock = null;
    vrm = null;
  }
  vrmStageEl.innerHTML = "";
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute("src");
    videoEl.load();
  }
}

/* ---------------- 本地视频形象加载 ---------------- */
async function loadVideo(avatar, requestId) {
  if (!videoEl) throw new Error("视频舞台不存在");
  videoEl.src = avatar.model;
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.playsInline = true;
  await new Promise((resolve, reject) => {
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("视频形象加载失败")); };
    const cleanup = () => {
      videoEl.removeEventListener("canplay", ready);
      videoEl.removeEventListener("error", failed);
    };
    videoEl.addEventListener("canplay", ready, { once: true });
    videoEl.addEventListener("error", failed, { once: true });
    videoEl.load();
  });
  if (requestId !== avatarSwitchSeq) return;
  try { await videoEl.play(); } catch (e) {}
}

/* ---------------- Live2D 加载 ---------------- */
async function loadLive2D(avatar, requestId) {
  const container = stageEl;
  const app = new PIXI.Application({
    backgroundAlpha: 0,
    resizeTo: container,
    antialias: true,
  });
  live2dApp = app;
  container.appendChild(app.view);

  const urls = avatar.fallback || [avatar.model];
  let model = null;
  for (const url of urls) {
    try {
      model = await PIXI.live2d.Live2DModel.from(url);
      break;
    } catch (e) {
      console.warn("Live2D 模型加载失败，尝试下一个来源：", url, e);
    }
  }
  if (!model) throw new Error("Live2D 模型全部来源加载失败");
  if (requestId !== avatarSwitchSeq) {
    try { model.destroy(); } catch (e) {}
    return null;
  }

  // 布局：底部对齐、占满舞台
  const baseWidth = model.width || 1;
  const baseHeight = model.height || 1;
  model.anchor.set(0.5, 1);
  const layout = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const view = LIVE2D_LAYOUTS[avatar.id] || { h: 1.02, w: 0.94, y: 1.02 };
    const s = Math.min((h * view.h) / baseHeight, (w * view.w) / baseWidth);
    model.scale.set(s);
    model.x = w / 2;
    model.y = h * view.y;
  };
  app.stage.addChild(model);
  layout();
  window.addEventListener("resize", layout);

  // 口型：说话期间驱动 ParamMouthOpenY（兼容 Cubism 2/4 参数名）
  const MOUTH_IDS = ["ParamMouthOpenY", "PARAM_MOUTH_OPEN_Y"];
  app.ticker.add(() => {
    if (!model) return;
    let v = 0;
    if (speaking) {
      const t = performance.now() / 1000;
      v = Math.abs(Math.sin(t * 9)) * moodById().mouth * (0.65 + Math.random() * 0.35);
    }
    try {
      const core = model.internalModel.coreModel;
      for (const id of MOUTH_IDS) {
        try { core.setParameterValueById(id, v); } catch (e) {}
      }
    } catch (e) {}
  });

  // 待机小动作
  const idleTimer = setInterval(() => {
    if (!speaking && model) {
      try {
        const groups = Object.keys(model.internalModel.settings.motions || {});
        const hit = groups.includes("TapBody") ? "TapBody" : groups.includes("tap_body") ? "tap_body" : null;
        if (hit) model.motion(hit);
      } catch (e) {}
    }
  }, 12000);

  live2dCleanup = () => {
    window.removeEventListener("resize", layout);
    clearInterval(idleTimer);
    model = null;
  };
  return model;
}

/* ---------------- VRM 加载 ---------------- */
async function loadVRM(avatar, requestId) {
  const container = vrmStageEl;
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const view = avatar.vrmView || {};

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0, view.cameraY ?? 1.08, view.cameraZ ?? 2.85);
  camera.lookAt(0, view.targetY ?? 0.96, 0);
  scene.add(new THREE.HemisphereLight(0xf4faf6, 0x60716b, 2.25));
  const key = new THREE.DirectionalLight(0xfff2dd, 3.1);
  key.position.set(2.4, 3.6, 3.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9deda, 1.8);
  fill.position.set(-3, 2.1, 2.2);
  scene.add(fill);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const loaded = await new Promise((resolve, reject) => {
    loader.load(avatar.model, (gltf) => {
      const vrmModel = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      // VRM0 与 VRM1 的正面方向不同，先按规范统一朝向。
      VRMUtils.rotateVRM0(vrmModel);
      vrmModel.scene.position.set(0, 0, 0);
      // 让手臂自然下垂
      const lua = vrmModel.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rua = vrmModel.humanoid.getNormalizedBoneNode("rightUpperArm");
      const lla = vrmModel.humanoid.getNormalizedBoneNode("leftLowerArm");
      const rla = vrmModel.humanoid.getNormalizedBoneNode("rightLowerArm");
      if (lua) lua.rotation.z = view.leftArmZ ?? -1.22;
      if (rua) rua.rotation.z = view.rightArmZ ?? 1.22;
      if (lla) lla.rotation.z = -0.08;
      if (rla) rla.rotation.z = 0.08;
      if (requestId !== avatarSwitchSeq) {
        reject(new Error("avatar_switch_cancelled"));
        return;
      }
      scene.add(vrmModel.scene);
      resolve(vrmModel);
    }, (ev) => {
      if (ev.total > 0) setLoading(`正在加载 3D 数字人 ${Math.round((ev.loaded / ev.total) * 100)}%`, true);
    }, reject);
  });

  const clock = new THREE.Clock();
  let blinkTimer = 0;
  let blinkPhase = 0;
  let elapsed = 0;

  const animate = () => {
    vrmRAF = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    const em = loaded && loaded.expressionManager;
    if (em) {
      // 眨眼
      blinkTimer -= delta;
      if (blinkTimer <= 0) {
        blinkPhase += delta * 14;
        em.setValue("blink", Math.sin(Math.min(Math.PI, blinkPhase * Math.PI)));
        if (blinkPhase >= 1) { em.setValue("blink", 0); blinkPhase = 0; blinkTimer = 2.4 + Math.random() * 2.6; }
      }
      // 说话口型：五音素，简化用正弦驱动 aa
      if (speaking) {
        em.setValue("aa", 0.22 + Math.abs(Math.sin(elapsed * 12)) * moodById().mouth);
      } else {
        em.setValue("aa", 0);
      }
    }
    if (loaded) {
      const head = loaded.humanoid.getNormalizedBoneNode("head");
      const chest = loaded.humanoid.getNormalizedBoneNode("chest");
      if (head) { head.rotation.y = Math.sin(elapsed * 0.42) * 0.035; head.rotation.x = Math.sin(elapsed * 0.31) * 0.018; }
      if (chest) chest.rotation.z = Math.sin(elapsed * 0.82) * (speaking ? 0.012 : 0.006);
      loaded.scene.position.y = Math.sin(elapsed * 1.05) * 0.008;
      loaded.update(delta);
    }
    renderer.render(scene, camera);
  };

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  animate();

  vrmRenderer = renderer;
  vrmScene = scene;
  vrmCamera = camera;
  vrm = loaded;
  vrmClock = clock;
  vrmCleanup = () => resizeObserver.disconnect();
  return loaded;
}

/* ---------------- 切换形象 ---------------- */
async function switchAvatar(index) {
  const avatar = AVATARS[index];
  if (!avatar) return;
  const requestId = ++avatarSwitchSeq;
  currentIndex = index;
  try { localStorage.setItem(SITE_AVATAR_KEY, avatar.id); } catch (e) {}

  // 更新 UI
  $$(".avatar-chip").forEach((chip, i) => chip.classList.toggle("is-active", i === index));
  $("#infoName").textContent = avatar.name;
  $("#infoRole").textContent = avatar.role;
  $("#infoDesc").textContent = avatar.desc;
  $("#infoSrc").textContent = "模型：" + avatar.src;
  updateVoiceStatus(avatar);
  if (!supportsOutfit(outfitById(), avatar)) {
    demoState.outfit = "base";
    saveDemoState();
  }
  renderOutfits();

  disposeAll();
  showStage(avatar.type);
  setLoading(`正在加载 ${avatar.name}…`, true);

  try {
    if (avatar.type === "live2d") {
      await loadLive2D(avatar, requestId);
    } else if (avatar.type === "vrm") {
      await loadVRM(avatar, requestId);
    } else if (avatar.type === "video") {
      await loadVideo(avatar, requestId);
    }
    if (requestId !== avatarSwitchSeq) return;
    setLoading("", false);
    addMsg(`我是 ${avatar.name}，${avatar.role}。今天想和我聊点什么？`, "avatar");
  } catch (e) {
    if (requestId !== avatarSwitchSeq) return;
    console.error("形象加载失败", e);
    disposeAll();
    showStage("static");
    setLoading("", false);
    addMsg(`${avatar.name} 暂时加载不出来，已切换到静态兜底形象。`, "avatar");
  }
}

/* ---------------- 形象栏渲染 ---------------- */
function renderBar() {
  const bar = $("#avatarBar");
  bar.innerHTML = "";
  AVATARS.forEach((avatar, i) => {
    const chip = document.createElement("button");
    chip.className = "avatar-chip" + (i === currentIndex ? " is-active" : "");
    chip.innerHTML = `<span class="chip-dot" style="background:${avatar.color}"></span>${avatar.name}`;
    chip.title = avatar.role;
    chip.addEventListener("click", () => switchAvatar(i));
    bar.appendChild(chip);
  });
}

function initialAvatarIndex() {
  try {
    let saved = localStorage.getItem(SITE_AVATAR_KEY);
    if (!saved) {
      saved = localStorage.getItem(LEGACY_SITE_AVATAR_KEY);
      if (saved) localStorage.setItem(SITE_AVATAR_KEY, saved);
    }
    const hit = AVATARS.findIndex((avatar) => avatar.id === saved);
    return hit >= 0 ? hit : 0;
  } catch (e) {
    return 0;
  }
}

function syncProfileChip() {
  const chip = $("#profileChip");
  if (!chip) return;
  let label = "Z";
  try {
    const raw = localStorage.getItem("neuromate-login-user") || localStorage.getItem("neuromate-user-profile") || "";
    const user = raw ? JSON.parse(raw) : null;
    label = (user?.nickname || user?.name || user?.account || "Z").slice(0, 1).toUpperCase();
  } catch (e) {}
  chip.textContent = label || "Z";
  chip.addEventListener("click", () => { window.location.href = "../../login.html"; });
}

/* ---------------- 对话 ---------------- */
const messages = $("#messages");
function addMsg(text, who) {
  const div = document.createElement("div");
  div.className = "msg msg--" + who;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

const GREETINGS = [
  "我在呢。慢慢说，不着急。",
  "看到你来啦。今天怎么样？",
  "嗯，我一直都在。想聊什么都行。",
  "先深呼吸一下，然后告诉我发生了什么？"
];

/* ---------------- 分角色中文音色 ---------------- */
const VOICE_HINTS = {
  female: ["Xiaoxiao", "晓晓", "Xiaoyi", "晓伊", "Huihui", "慧慧", "Yaoyao", "瑶瑶", "Ting-Ting", "Mei-Jia"],
  male: ["Yunxi", "云希", "Yunyang", "云扬", "Yunjian", "云健", "Kangkang", "康康"]
};

function refreshVoices() {
  availableVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  updateVoiceStatus(AVATARS[currentIndex]);
}

function chineseVoices() {
  return availableVoices.filter((voice) => /(^|[-_])zh|chinese|中文/i.test(`${voice.lang} ${voice.name}`));
}

function chooseVoice(profile = {}) {
  const voices = chineseVoices();
  if (!voices.length) return null;
  const preferred = profile.preferred || [];
  for (const hint of preferred) {
    const hit = voices.find((voice) => voice.name.toLowerCase().includes(String(hint).toLowerCase()));
    if (hit) return hit;
  }
  const fallbackHints = VOICE_HINTS[profile.fallback] || [];
  for (const hint of fallbackHints) {
    const hit = voices.find((voice) => voice.name.toLowerCase().includes(String(hint).toLowerCase()));
    if (hit) return hit;
  }
  return voices[0];
}

function updateVoiceStatus(avatar = AVATARS[currentIndex]) {
  const status = $("#voiceStatus");
  if (!status) return;
  if (!window.speechSynthesis) {
    status.textContent = "当前浏览器不支持语音";
    return;
  }
  const voice = chooseVoice(avatar?.voice);
  status.textContent = voice ? `${avatar.name}音色：${voice.name}` : `${avatar.name}音色：系统默认（建议安装中文语音包）`;
}

if (window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

/* ---------------- 对话 API / 本地降级 ---------------- */
function setAIStatus(text) {
  const status = $("#aiStatus");
  if (status) status.textContent = text;
}

async function detectAI() {
  try {
    const resp = await fetch("/api/health", { cache: "no-store" });
    const data = await resp.json();
    setAIStatus(data.apiConfigured ? `API 已配置 · ${data.model}` : "本地模拟回复");
  } catch (e) {
    setAIStatus("本地模拟回复");
  }
}

async function callAI(message, history) {
  const avatar = AVATARS[currentIndex];
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message,
    history,
    avatar: { name: avatar.name, role: avatar.role },
    context: {
      mood: moodById().label,
      moodId: demoState.mood,
      outfit: outfitById().name,
      quiet: demoState.quiet,
      memory: demoState.memory
    }
  })
  });
  if (!resp.ok) throw new Error(`chat_http_${resp.status}`);
  return resp.json();
}

function mockReply(text) {
  const t = text;
  if (/你好|hi|hello|嗨|哈喽/i.test(t))
    return { text: "你好呀！很高兴见到你。想聊天、吐槽，或者先安静待一会儿都可以。", mood: "happy" };
  if (/累|疲惫|压力|焦虑|烦|难受|难过|哭/.test(t))
    return { text: "听起来你最近有些辛苦。先深呼吸一下，对，就是这样。我会一直在这里陪着你，慢慢说。", mood: /累|疲惫/.test(t) ? "tired" : "anxious" };
  if (/开心|高兴|棒|好消息|耶/.test(t))
    return { text: "真为你高兴！快跟我讲讲，是什么让今天变得这么亮堂？", mood: "happy" };
  if (/睡|失眠|睡不着/.test(t))
    return { text: "睡不着的时候，可以试试把手机放远一点，跟着我做三次慢呼吸：吸气 4 秒，屏住 2 秒，呼气 6 秒。", mood: "calm" };
  if (/考试|作业|学习|复习/.test(t))
    return { text: "我们先把任务缩小，只看下一步。先列出最容易开始的一小题，再给自己十分钟。", mood: "focus" };
  if (/拜拜|再见|走了|晚安/.test(t))
    return { text: "再见啦，照顾好自己。想说话的时候，随时回来。", mood: "bye" };
  const pool = [
    "嗯，我在认真听，可以再和我说说吗？",
    "原来是这样。无论发生什么，你的感受都很重要。",
    "谢谢你愿意告诉我这些。",
    "别急，我们可以一点一点来。",
    "我能感觉到你今天有点不一样，想聊聊吗？"
  ];
  return { text: pool[Math.floor(Math.random() * pool.length)], mood: "gentle" };
}

function speak(text) {
  if (!voiceOn || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const avatar = AVATARS[currentIndex];
  const profile = avatar.voice || {};
  const mood = moodById();
  const voice = chooseVoice(profile);
  u.lang = "zh-CN";
  u.rate = Math.max(0.65, Math.min(1.25, (profile.rate || 0.95) * mood.rate));
  u.pitch = Math.max(0.65, Math.min(1.35, (profile.pitch || 1) * mood.pitch));
  if (voice) u.voice = voice;
  u.onstart = () => { speaking = true; };
  u.onend = () => { speaking = false; };
  u.onerror = () => { speaking = false; };
  window.speechSynthesis.speak(u);
}

async function handleSend(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  addMsg(clean, "user");
  const pending = addMsg("正在想一想…", "avatar");
  const previousHistory = chatHistory.slice(-20);
  chatHistory.push({ role: "user", content: clean });
  let reply;
  try {
    const data = await callAI(clean, previousHistory);
    reply = { text: data.reply, mood: inferMoodAndFocus(clean).mood };
    setAIStatus(data.mode === "api"
      ? `API 已连接 · ${data.model || "当前模型"}`
      : `API 已降级 · ${data.model || "本地回复"}`);
  } catch (e) {
    reply = mockReply(clean);
    setAIStatus("API 暂不可用 · 已切换本地回复");
  }
  chatHistory.push({ role: "assistant", content: reply.text });
  if (chatHistory.length > 40) chatHistory.splice(0, chatHistory.length - 40);
  pending.textContent = reply.text;
  messages.scrollTop = messages.scrollHeight;
  updateMemory(clean, reply.mood);
  speak(reply.text);
}

/* ---------------- 事件绑定 ---------------- */
$("#chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#chatInput");
  handleSend(input.value);
  input.value = "";
});
$("#btnGreet").addEventListener("click", () => {
  const text = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  addMsg(text, "avatar");
  speak(text);
});
$("#btnSpeak").addEventListener("click", () => {
  voiceOn = !voiceOn;
  $("#btnSpeak").classList.toggle("is-on", voiceOn);
  $("#btnSpeak").textContent = voiceOn ? "语音回复" : "语音已关";
  if (!voiceOn && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    speaking = false;
  }
});
$("#btnMood").addEventListener("click", () => {
  moodIndex = (MOODS.findIndex((mood) => mood.id === demoState.mood) + 1) % MOODS.length;
  setMood(MOODS[moodIndex].id, { speakLine: true });
});
$("#btnQuiet").addEventListener("click", () => toggleQuiet());

/* ---------------- API 配置面板 ---------------- */
const apiModal = $("#apiModal");
const apiStatus = $("#apiTestStatus");

function setApiPanelStatus(text, state = "") {
  apiStatus.textContent = text;
  apiStatus.dataset.state = state;
}

function apiFormData() {
  return {
    baseUrl: $("#apiBaseUrl").value.trim(),
    model: $("#apiModel").value.trim(),
    apiKey: $("#apiKey").value.trim()
  };
}

async function syncApiConfig() {
  setApiPanelStatus("正在同步服务端配置…");
  try {
    const resp = await fetch("/api/config", { cache: "no-store" });
    if (!resp.ok) throw new Error(`config_http_${resp.status}`);
    const data = await resp.json();
    $("#apiBaseUrl").value = data.baseUrl || "";
    $("#apiModel").value = data.model || "";
    $("#apiKey").value = "";
    setApiPanelStatus(
      data.configured
        ? `已同步：${data.model}。服务端已有 Key，留空即可继续使用。`
        : `已同步：${data.model}。服务端还没有 Key，请手动填写。`,
      data.configured ? "ok" : ""
    );
  } catch (e) {
    setApiPanelStatus("同步失败，请确认通过 run.bat 启动本地服务。", "error");
  }
}

async function postApiConfig(path) {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiFormData())
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `api_http_${resp.status}`);
  return data;
}

function friendlyApiError(error) {
  const code = String(error?.message || error);
  if (code.includes("api_key_required")) return "没有可用的 API Key，请填写后再试。";
  if (code.includes("invalid_base_url")) return "API 地址格式不正确，需要完整的 http/https 地址。";
  if (code.includes("llm_http_error")) return "接口已响应，但鉴权、模型名或额度可能有问题。";
  if (code.includes("llm_network_error")) return "网络连接失败，请检查 API 地址和网络。";
  return `操作失败：${code}`;
}

$("#btnApiConfig").addEventListener("click", () => {
  apiModal.hidden = false;
  syncApiConfig();
  setTimeout(() => $("#apiBaseUrl").focus(), 0);
});
$("#btnApiClose").addEventListener("click", () => { apiModal.hidden = true; });
apiModal.addEventListener("click", (event) => {
  if (event.target === apiModal) apiModal.hidden = true;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !apiModal.hidden) apiModal.hidden = true;
});
$("#btnApiSync").addEventListener("click", syncApiConfig);
$("#btnApiTest").addEventListener("click", async () => {
  setApiPanelStatus("正在测试连接，请稍候…");
  try {
    const data = await postApiConfig("/api/config/test");
    setApiPanelStatus(`连接成功：${data.model} · ${data.latencyMs}ms · 返回 ${data.reply}`, "ok");
  } catch (error) {
    setApiPanelStatus(friendlyApiError(error), "error");
  }
});
$("#btnApiSave").addEventListener("click", async () => {
  setApiPanelStatus("正在保存并应用…");
  try {
    const data = await postApiConfig("/api/config");
    $("#apiKey").value = "";
    setAIStatus(`API 已配置 · ${data.model}`);
    setApiPanelStatus(`已应用 ${data.model}。Key 仅保留在当前服务进程内存中。`, "ok");
  } catch (error) {
    setApiPanelStatus(friendlyApiError(error), "error");
  }
});

/* ---------------- 启动 ---------------- */
renderBar();
initV15Panel();
detectAI();
syncProfileChip();
switchAvatar(initialAvatarIndex());

