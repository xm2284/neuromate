/* ============================================================
 * 元知己 · 数字人形象注册表（第三阶段整合 Demo）
 * 6 个形象；默认以元安 Live2D 为主形象：
 *   ① 元安（Hiyori 温柔学姐 · Live2D）
 *   ② 元晴（shizuku 元气少女 · Live2D）
 *   ③ 元澈（Natori 西装男 · Live2D）
 *   ④ 虹色Mao（官方魔术少女示例 · Live2D）
 *   ⑤ 元元熊猫（视频形象 · MP4）
 *   ⑥ 元初（静态数字人 · PNG 兜底）→ V1.3 基线形象
 * ============================================================ */
window.NEUROMATE_AVATARS = [
  {
    id: "yuanan",
    name: "元安",
    role: "主形象 · 温柔学姐",
    type: "live2d",
    desc: "你遇到难处时，总想第一个找她聊聊。声音轻、有耐心，像一位永远在线的知心学姐。",
    src: "Live2D（Hiyori）",
    color: "#e8a0b4",
    voice: {
      preferred: ["Xiaoxiao", "晓晓", "Huihui", "慧慧", "Ting-Ting"],
      fallback: "female",
      rate: 0.92,
      pitch: 1.02
    },
    model: "model/live2d/hiyori/Hiyori.model3.json",
    fallback: ["model/live2d/hiyori/Hiyori.model3.json"]
  },
  {
    id: "yuanqing",
    name: "元晴",
    role: "元气少女",
    type: "live2d",
    desc: "永远乐观的小太阳。情绪低落的时候，听听她活力满满的声音，心情会跟着亮起来。",
    src: "Live2D（shizuku）",
    color: "#7ec8a3",
    voice: {
      preferred: ["Xiaoyi", "晓伊", "Yunxia", "云夏", "Yaoyao", "瑶瑶"],
      fallback: "female",
      rate: 1.06,
      pitch: 1.15
    },
    model: "model/live2d/shizuku/shizuku.model.json",
    fallback: [
      "model/live2d/shizuku/shizuku.model.json",
      "https://fastly.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json"
    ]
  },
  {
    id: "yuanche",
    name: "元澈",
    role: "沉稳学长",
    type: "live2d",
    desc: "理性沉稳的学长型数字人，适合需要冷静分析、梳理思路的时刻。",
    src: "Live2D（Natori）",
    color: "#7c8aa8",
    voice: {
      preferred: ["Yunyang", "云扬", "Yunxi", "云希", "Kangkang", "康康"],
      fallback: "male",
      rate: 0.9,
      pitch: 0.82
    },
    model: "model/live2d/Natori/Natori.model3.json",
    fallback: [
      "model/live2d/Natori/Natori.model3.json",
      "https://fastly.jsdelivr.net/gh/Live2D/CubismWebSamples@master/Samples/Resources/Natori/Natori.model3.json"
    ]
  },
  {
    id: "mao",
    name: "虹色Mao",
    role: "魔术少女 · 官方示例",
    type: "live2d",
    desc: "Live2D 官方示例角色“虹色 Mao”，适合验证 Cubism 5 表情与动作；她不是猫咪形象。",
    src: "Live2D（官方样例 Mao，使用前需复核授权范围）",
    color: "#c9a06c",
    voice: {
      preferred: ["Xiaoyi", "晓伊", "Yaoyao", "瑶瑶", "Huihui", "慧慧"],
      fallback: "female",
      rate: 1.04,
      pitch: 1.1
    },
    model: "model/live2d/mao_zh-Hans/runtime/mao_pro.model3.json",
    fallback: ["model/live2d/mao_zh-Hans/runtime/mao_pro.model3.json"]
  },
  {
    id: "panda",
    name: "元元熊猫",
    role: "治愈熊猫 · 视频形象",
    type: "video",
    desc: "熊猫形象，以本地循环视频展示。它和 Live2D 的虹色 Mao 是两个不同角色。",
    src: "本地视频（panda.mp4）",
    color: "#89a98b",
    voice: {
      preferred: ["Xiaoxiao", "晓晓", "Huihui", "慧慧", "Yaoyao", "瑶瑶"],
      fallback: "female",
      rate: 0.9,
      pitch: 0.95
    },
    model: "assets/panda.mp4"
  },
  {
    id: "yuanchu",
    name: "元初",
    role: "兜底形象 · 不挑设备",
    type: "static",
    desc: "最朴素的静态数字人。任何设备、断网都能显示，作为演示的最后一层保险。",
    src: "元知己 V1.3 基线 · 静态形象",
    color: "#a8b8c4",
    voice: {
      preferred: ["Xiaoxiao", "晓晓", "Huihui", "慧慧"],
      fallback: "female",
      rate: 0.96,
      pitch: 1.0
    },
    model: "../../assets/yuanchu-card.svg"
  }
];
