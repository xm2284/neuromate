/* ============================================================
 * 元知己 · 语音谈心页 3D 数字人（V1.4 整合 + 换装雏形）
 * 渲染 VRM 形象到 #vrmCanvas，监听 voice-chat.js 派发的
 * 'dh:avatar' 事件：speak-start / speak-end / expression /
 * listen-start / listen-end，驱动口型、表情与倾听姿态。
 * 支持点击"换装"在多个 VRM 模型间切换（装扮系统雏形）。
 * 加载失败时自动隐藏舞台，语音功能不受影响。
 * ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/* 可切换的形象：当前阶段先全部免费开放，方便演示语音页换装流程。 */
const MODELS = [
  { url: './models/VRM1_Constraint_Twist_Sample.vrm', label: '元元' },
  { url: './models/AvatarSample_B.vrm', label: '小舟', shopId: 'avatar-xiaozhou', cost: 800 },
  { url: './models/AvatarSample_A.vrm', label: '爱丽丝', shopId: 'avatar-alice', cost: 800 },
];

/* 星贝共享钱包（wallet.js）：判断形象是否已购买 */
const wallet = window.NeurWallet || null;
function isUnlocked(m) { return true; }
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2800);
}

const canvas = document.getElementById('vrmCanvas');
const stage = document.getElementById('vrmStage');
const loadingEl = document.getElementById('vrmLoading'); // 可能为 null（已取消加载占位）
const switchBtn = document.getElementById('vrmSwitch');

if (!canvas || !stage) {
  // 页面没有舞台元素：什么都不做
} else {
  init().catch((err) => {
    console.warn('3D 数字人加载失败，回退纯语音模式：', err);
    stage.classList.add('vrm-failed');
  });
}

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);

  const light = new THREE.DirectionalLight(0xffffff, 1.6);
  light.position.set(1, 1.5, 2);
  scene.add(light, new THREE.AmbientLight(0xffffff, 0.9));

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  /* 优先使用 vrm-models.js 内嵌的模型数据（双击 html 直接打开时无需服务器） */
  const EMBEDDED_MODELS = window.VRM_MODELS_B64 || null;
  function b64ToBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function loadGltf(url) {
    if (EMBEDDED_MODELS && EMBEDDED_MODELS[url]) {
      return new Promise((resolve, reject) =>
        loader.parse(b64ToBuffer(EMBEDDED_MODELS[url]), '', resolve, reject));
    }
    return loader.loadAsync(url);
  }

  let vrm = null;
  let baseRot = {};

  /* ---------- 模型加载与换装 ---------- */
  async function loadModel(url) {
    if (loadingEl) loadingEl.classList.remove('done');
    if (switchBtn) switchBtn.disabled = true;

    // 卸载旧模型
    if (vrm) {
      scene.remove(vrm.scene);
      VRMUtils.deepDispose(vrm.scene);
      vrm = null;
    }

    const gltf = await loadGltf(url);
    const next = gltf.userData.vrm;
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    // VRM 0.x 模型朝向转换
    if (next.meta && String(next.meta.metaVersion) === '0') {
      VRMUtils.rotateVRM0(next);
    }
    scene.add(next.scene);
    vrm = next;

    // 依据包围盒取景（胸部以上）
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const headY = box.max.y - size.y * 0.18;
    camera.position.set(center.x, headY, center.z + size.y * 0.95);
    camera.lookAt(center.x, headY - size.y * 0.06, center.z);
    if (vrm.lookAt) vrm.lookAt.target = camera;

    // 记录骨骼初始姿态
    baseRot = {};
    for (const name of ['spine', 'chest', 'neck', 'head', 'leftUpperArm', 'rightUpperArm']) {
      const bone = vrm.humanoid.getNormalizedBoneNode(name);
      if (bone) baseRot[name] = bone.rotation.clone();
    }

    // T-pose → 自然垂臂：自动选择让手腕降得最低的旋转方向（适配不同模型的骨骼轴向）
    relaxArm('leftUpperArm', 'leftHand');
    relaxArm('rightUpperArm', 'rightHand');
    for (const n of ['leftUpperArm', 'rightUpperArm']) {
      const bone = vrm.humanoid.getNormalizedBoneNode(n);
      if (bone) baseRot[n] = bone.rotation.clone();
    }

    if (loadingEl) loadingEl.classList.add('done');
    if (switchBtn) switchBtn.disabled = false;
  }

  // 让手臂自然下垂：仅当手高于肩（T/A-pose）时才调整，
  // 在多个角度候选中挑"手腕低于肩且最低"的方向（适配不同模型骨骼轴向）
  function relaxArm(armName, handName) {
    const arm = vrm.humanoid.getNormalizedBoneNode(armName);
    const hand = vrm.humanoid.getNormalizedBoneNode(handName);
    if (!arm || !hand) return;
    const baseZ = arm.rotation.z;
    vrm.scene.updateMatrixWorld(true);
    const shoulderY = new THREE.Vector3().setFromMatrixPosition(arm.matrixWorld).y;
    const y0 = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld).y;
    if (y0 < shoulderY - 0.05) return; // 手已经明显低于肩，保持原姿势
    let bestZ = baseZ, bestY = Infinity;
    for (const dz of [0.6, -0.6, 0.9, -0.9, 1.2, -1.2]) {
      arm.rotation.z = baseZ + dz;
      vrm.scene.updateMatrixWorld(true);
      const y = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld).y;
      if (y < shoulderY - 0.02 && y < bestY) { bestY = y; bestZ = baseZ + dz; }
    }
    arm.rotation.z = bestZ;
  }

  let modelIndex = 0;
  await loadModel(MODELS[modelIndex].url);
  window.__avatarReady = true; // 自动化验证用就绪标记

  if (switchBtn) {
    switchBtn.addEventListener('click', async () => {
      for (let step = 1; step < MODELS.length; step++) {
        const idx = (modelIndex + step) % MODELS.length;
        const m = MODELS[idx];
        modelIndex = idx;
        const nameEl = stage.querySelector('.vrm-name');
        if (nameEl) nameEl.textContent = m.label;
        try {
          await loadModel(m.url);
        } catch (e) {
          console.warn('换装失败：', e);
        }
        return;
      }
    });
  }

  /* ---------- 状态：说话 / 倾听 / 表情 ---------- */
  let speaking = false;
  let mouthOpen = 0;
  let flapTimer = null;
  let listening = false;
  let exprResetAt = 0;
  const EXPRESSIONS = ['happy', 'sad', 'angry', 'relaxed', 'surprised'];

  function startFlap() {
    stopFlap();
    speaking = true;
    const tick = () => {
      mouthOpen = 0.25 + Math.random() * 0.6;
      flapTimer = setTimeout(tick, 110 + Math.random() * 120);
    };
    tick();
  }
  function stopFlap() {
    speaking = false;
    if (flapTimer) { clearTimeout(flapTimer); flapTimer = null; }
  }
  function setExpression(name, duration = 5) {
    if (!vrm) return;
    if (!EXPRESSIONS.includes(name)) name = 'relaxed';
    for (const e of EXPRESSIONS) vrm.expressionManager.setValue(e, e === name ? 0.85 : 0);
    exprResetAt = clock.elapsedTime + duration;
  }

  document.addEventListener('dh:avatar', (ev) => {
    const { type, name } = ev.detail || {};
    if (type === 'speak-start') startFlap();
    else if (type === 'speak-end') stopFlap();
    else if (type === 'expression') setExpression(name);
    else if (type === 'listen-start') { listening = true; setExpression('relaxed', 3600); }
    else if (type === 'listen-end') { listening = false; exprResetAt = 0; }
  });

  /* ---------- 待机动作 ---------- */
  let blinkAt = 2.5;
  let blinkT = -1;
  const clock = new THREE.Clock();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    resize();
    if (!vrm) { renderer.render(scene, camera); return; }

    // 呼吸 / 微晃 / 头部轻摆
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const spine = vrm.humanoid.getNormalizedBoneNode('spine');
    const head = vrm.humanoid.getNormalizedBoneNode('head');
    if (chest) chest.rotation.x = baseRot.chest.x + Math.sin(t * 1.4) * 0.018;
    if (spine) spine.rotation.z = baseRot.spine.z + Math.sin(t * 0.6) * 0.012;
    if (head) {
      head.rotation.z = baseRot.head.z + Math.sin(t * 0.45) * 0.02;
      // 倾听时微微前倾点头
      const nod = listening ? 0.08 + Math.sin(t * 1.2) * 0.015 : 0;
      head.rotation.x = baseRot.head.x + nod;
    }

    // 眨眼
    if (blinkT < 0 && t > blinkAt) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      const p = blinkT / 0.24;
      const v = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2);
      vrm.expressionManager.setValue('blink', v);
      if (p >= 1) { blinkT = -1; blinkAt = t + 2 + Math.random() * 4; }
    }

    // 口型：说话时按节奏开合
    let target = 0;
    if (speaking) {
      target = mouthOpen;
      mouthOpen *= 0.86;
    }
    const cur = vrm.expressionManager.getValue('aa') || 0;
    vrm.expressionManager.setValue('aa', cur + (target - cur) * 0.55);

    // 表情自动回落
    if (exprResetAt && t >= exprResetAt && !listening) {
      for (const e of EXPRESSIONS) vrm.expressionManager.setValue(e, 0);
      exprResetAt = 0;
    }

    vrm.update(dt);
    renderer.render(scene, camera);
  }
  loop();

  window.addEventListener('beforeunload', () => stopFlap());
}
