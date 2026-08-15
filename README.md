# 元知己 Neuromate

**校园 AI 情绪陪伴 · V1.5 完整整合版**

元知己是一个面向校园场景的 AI 情绪陪伴应用。V1.5 把数字人放回完整网页流程：首页认识项目、数字人页陪伴、语音页承接音色、我的空间管理形象与装扮、API 页面负责配置——角色、装扮、心情在所有页面间同步一致。

---

## 界面预览

<p align="center">
  <img src="docs/screenshots/home.png" width="48%" alt="首页" />
  <img src="docs/screenshots/companion.png" width="48%" alt="数字人陪伴页" />
</p>
<p align="center">
  <img src="docs/screenshots/voice-chat.png" width="48%" alt="语音页" />
  <img src="docs/screenshots/space.png" width="48%" alt="我的空间" />
</p>
<p align="center">
  <img src="docs/screenshots/membership.png" width="48%" alt="会员与星贝" />
  <img src="docs/screenshots/api-config.png" width="48%" alt="API 配置" />
</p>

---

## 核心特性

- **7 个数字人形象**：Live2D、VRM 3D、视频、静态兜底四类渲染统一由 `companion-renderer.js` 接管，加载失败自动回退到静态形象，不留空框。
- **全局角色同步**：角色选择写入 `neuromate-avatar-mode-v15`，数字人页、语音页、大屏预览、我的空间读取同一份选择。
- **装扮系统**：元熙 VRM 保留小舟、爱丽丝两个 3D 装扮位，换装实时同步回数字人页；当前全部免费。
- **语音与音色**：语音页跟随当前角色，状态文案、气泡头像、音色预设同步切换，支持语速 / 音高调节。
- **心情与状态**：心情调色盘联动背景、语录、输入提示与数字人反馈，最近一次心情持久化保存。
- **API 配置**：独立配置页，可填写、保存、测试后端接口，前端不保存真实 Key。
- **本地直开**：`启动演示.bat` 一键启动，也可 `node _local-server.js` 起本地服务器。

## 数字人形象一览

| 形象 | 类型 | 说明 |
| --- | --- | --- |
| 元安 | Live2D | 默认主形象 · 温柔学姐 |
| 元晴 | Live2D | 元气少女 |
| 元熙 | VRM 3D | 3D 形象 · 含小舟、爱丽丝两个装扮位 |
| 元澈 | Live2D | 沉稳学长 |
| 虹色Mao | Live2D | 官方示例角色 · 魔术少女 |
| 元元熊猫 | 视频 | 治愈熊猫视频形象 |
| 元初 | 静态 | 兜底形象 · 首页展示 |

## 快速开始

```bash
git clone https://github.com/xm2284/neuromate.git
cd neuromate
```

方式一：直接双击 `启动演示.bat`

方式二：Node 本地服务器

```bash
node _local-server.js 8321
```

浏览器访问 <http://localhost:8321>，即可使用完整流程：登录 → 数字人陪伴 → 语音聊天 → 我的空间换装 → API 配置。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| Live2D | pixi-live2d-display + Live2D Cubism Core |
| VRM 3D | three.js + @pixiv/three-vrm |
| 页面框架 | 原生 HTML / CSS / JavaScript |
| 语音 | Web Speech API（浏览器内置中文音色） |
| 状态存储 | localStorage（角色、装扮、心情跨页同步） |

## 项目结构

```text
neuromate/
├── index.html          首页（项目介绍 + 首屏视频）
├── companion.html      数字人陪伴页（主舞台 + 形象切换）
├── voice-chat.html     语音页（音色与角色同步）
├── space.html          我的空间（角色卡 + 装扮）
├── membership.html     会员与星贝
├── api-config.html     API 配置
├── companion-renderer.js  数字人统一渲染器
├── site-avatar-registry.js 全局角色注册表
├── integrations/
│   └── digital-human-demo/  Live2D/VRM 渲染与模型
├── models/             VRM 模型
└── docs/screenshots/   README 截图
```

## 使用说明

完整整合说明见 [README-V1.5-完整整合说明.md](README-V1.5-完整整合说明.md)。

## License

[MIT](LICENSE) © 2026 元知己项目组
