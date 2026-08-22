/* ============================================================
 * 局部附件挂载系统（配饰）
 * 与"换整模型"明确区分：
 *  - 换模型 = 替换整个 VRM（不同角色/整体造型变化）
 *  - 配饰   = 独立 Object3D，锚定到 VRM 规范化骨骼
 *            （head / rightHand 等），跟随骨骼姿态运动；
 *            偏移量与朝向在世界坐标系定义后换算回骨骼局部，
 *            切换模型（不同骨骼局部轴向）或窗口缩放都不会漂移。
 * 蝴蝶结使用与数字人同源的 VRoid 官方样例模型（Victoria_Rubin）中
 * 提取的真实缎带网格（见 accessory-models.js 注释），
 * 其余配饰为 three.js 程序化几何体，莫兰迪马卡龙配色。
 * ============================================================ */
import * as THREE from './three/three.module.js';
import { GLTFLoader } from './three/GLTFLoader.js';
import { ACCESSORY_GLBS } from './accessory-models.js';

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, ...extra });
}

/* ---- 内嵌 GLB 配饰加载（解析一次、克隆复用；资源与缓存共享，摘除时不销毁） ---- */
const glbCache = new Map();
function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
function loadAccessoryGlb(key) {
  if (!glbCache.has(key)) {
    const buf = base64ToArrayBuffer(ACCESSORY_GLBS[key].split(',')[1]);
    glbCache.set(key, new GLTFLoader().parseAsync(buf, '').then((g) => g.scene));
  }
  return glbCache.get(key);
}

/* 蝴蝶结（真实缎带）：提取自 VRoid 官方样例 Victoria_Rubin 的发饰缎带，
 * 含结扣与两条下垂飘带；以结扣附近为原点，斜戴在头侧。 */
function buildRibbon() {
  const g = new THREE.Group();
  g.userData.shared = true; // 内部为缓存克隆，摘除时不可 dispose
  loadAccessoryGlb('ribbon')
    .then((model) => g.add(model.clone()))
    .catch(() => { /* 资源内嵌，正常不会失败 */ });
  return g;
}

/* 猫耳：柔滑圆锥外耳 + 粉色内耳，微微外撇 */
function buildCatEars() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.082, 20), mat(0x8a7a95));
    ear.position.set(s * 0.058, 0.188, 0.004);
    ear.rotation.z = -s * 0.16;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 16), mat(0xf5c3d2));
    inner.position.set(s * 0.058, 0.18, 0.018);
    inner.rotation.z = -s * 0.16;
    g.add(ear, inner);
  }
  return g;
}

/* 星星手杖：木杆 + 金环 + 发光星星，握在右手 */
function buildWand() {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.34, 12), mat(0xc09a6b));
  rod.position.y = 0.14;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.004, 8, 16), mat(0xd9b36a, { metalness: 0.5, roughness: 0.3 }));
  collar.position.y = 0.3;
  collar.rotation.x = Math.PI / 2;
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.052 : 0.022;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? starShape.moveTo(x, y) : starShape.lineTo(x, y);
  }
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, { depth: 0.014, bevelEnabled: false }),
    mat(0xf5d67a, { emissive: 0xa8842a, emissiveIntensity: 0.65 })
  );
  star.position.set(0, 0.37, -0.007);
  g.add(rod, collar, star);
  return g;
}

/* 圆框眼镜：细圆环 + 鼻梁 + 镜腿 */
function buildGlasses() {
  const g = new THREE.Group();
  const frame = mat(0x55505e, { metalness: 0.55, roughness: 0.35 });
  const ringGeo = new THREE.TorusGeometry(0.028, 0.0028, 10, 28);
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(ringGeo, frame);
    ring.position.set(s * 0.033, 0, 0);
    const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.095, 8), frame);
    temple.rotation.x = Math.PI / 2;
    temple.position.set(s * 0.062, 0.004, -0.046);
    g.add(ring, temple);
  }
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0035, 0.0035), frame));
  return g;
}

export const ACCESSORIES = [
  { id: 'bow', name: '蝴蝶结', icon: '🎀', bone: 'head', offset: [0.098, 0.082, -0.005], rotation: [0, 0.35, -0.25], scale: 0.8, build: buildRibbon },
  { id: 'cat-ears', name: '猫耳', icon: '🐱', bone: 'head', offset: [0, 0, 0], build: buildCatEars },
  { id: 'star-wand', name: '星星手杖', icon: '🪄', bone: 'rightHand', offset: [0.045, 0.02, 0.10], rotation: [0.38, 0, 0], build: buildWand },
  { id: 'round-glasses', name: '圆框眼镜', icon: '👓', bone: 'head', offset: [0, 0.048, 0.105], build: buildGlasses },
];

export class AccessoryManager {
  constructor() {
    this.attached = new Map(); // id -> Object3D
  }

  /* 把一组配饰挂载到当前 VRM 上（世界坐标偏移/朝向 → 骨骼局部） */
  apply(vrm, ids) {
    // 先真正摘除旧配饰（从骨骼上移除并释放几何体/材质），防止重复叠加
    for (const obj of this.attached.values()) {
      obj.removeFromParent();
      if (obj.userData.shared) continue; // 缓存克隆（提取自 VRM 的配饰），几何体/材质共享不可销毁
      obj.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    this.attached.clear();
    if (!vrm) return;
    vrm.scene.updateMatrixWorld(true);
    for (const id of ids) {
      const def = ACCESSORIES.find((a) => a.id === id);
      if (!def) continue;
      const bone = vrm.humanoid.getNormalizedBoneNode(def.bone);
      if (!bone) continue;
      const obj = def.build();
      if (def.scale) obj.scale.setScalar(def.scale);
      // 位置：世界坐标偏移 → 骨骼局部坐标
      const world = bone.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...def.offset));
      obj.position.copy(bone.worldToLocal(world));
      // 朝向：世界系期望朝向 → 骨骼局部四元数（不同模型骨骼局部轴向不同，必须换算）
      const desired = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(def.rotation || [0, 0, 0])));
      obj.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));
      bone.add(obj);
      this.attached.set(id, obj);
    }
  }
}
