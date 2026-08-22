<div align="center">

# 元知己 Neuromate

**校园 AI 情绪陪伴应用 · V1.6 完整整合版**

[![Version](https://img.shields.io/badge/Version-V1.6%20%E5%AE%8C%E6%95%B4%E6%95%B4%E5%90%88%E7%89%88-blueviolet)](https://github.com/xm2284/neuromate)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Site Check](https://img.shields.io/github/actions/workflow/status/xm2284/neuromate/ci.yml?label=Site%20Check)](https://github.com/xm2284/neuromate/actions)
[![Stars](https://img.shields.io/github/stars/xm2284/neuromate)](https://github.com/xm2284/neuromate)
[![Repo Size](https://img.shields.io/github/repo-size/xm2284/neuromate)](https://github.com/xm2284/neuromate)

一个面向校园场景的 AI 情绪陪伴应用。8 个数字人形象、装扮、语音、心情系统、API 配置和本地 Agent 接口完整整合，**本地即可演示，断网也能展示核心流程**。

</div>

---

## 界面预览

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/home.png" alt="首页"></td>
    <td width="50%"><img src="docs/screenshots/companion.png" alt="数字人陪伴页"></td>
  </tr>
  <tr>
    <td align="center"><b>首页</b> · 项目介绍与首屏视频</td>
    <td align="center"><b>数字人陪伴页</b> · 主舞台 + 7 形象切换</td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/voice-chat.png" alt="语音页"></td>
    <td width="50%"><img src="docs/screenshots/space.png" alt="我的空间"></td>
  </tr>
  <tr>
    <td align="center"><b>语音页</b> · 音色跟随当前角色</td>
    <td align="center"><b>我的空间</b> · 角色卡 + 装扮</td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/membership.png" alt="会员与星贝"></td>
    <td width="50%"><img src="docs/screenshots/api-config.png" alt="API 配置"></td>
  </tr>
  <tr>
    <td align="center"><b>会员与星贝</b> · 会员权益体系</td>
    <td align="center"><b>API 配置</b> · 演示可留空，正式接入可配置</td>
  </tr>
</table>

## 核心特性

- **四类数字人统一渲染**：Live2D、VRM 3D、视频、静态兜底，由 `companion-renderer.js` 统一接管，加载失败自动回退，不留空框。
- **优先展示高完成度形象**：默认展示元安 Live2D；元瑶静态换装形象作为第二展示位，保证离线和低性能设备也能稳定呈现。
- **全局角色同步**：角色选择写入 `neuromate-avatar-mode-v16`，并兼容旧版 `neuromate-avatar-mode-v15`；数字人页、语音页、我的空间读取同一份选择。
- **装扮系统**：元熙 VRM 保留小舟、爱丽丝两个 3D 装扮位，换装实时同步回数字人页。
- **语音与音色**：语音页跟随当前角色，状态文案、气泡头像、音色预设同步切换，支持语速 / 音高调节。
- **心情与状态**：心情调色盘联动背景、语录、输入提示与数字人反馈，最近一次心情持久化保存。
- **API 可配置**：独立配置页填写 / 保存 / 测试后端接口；演示可留空并使用本地回复，正式接入建议走后端代理。
- **离线演示兜底**：本地服务提供 `/api/chat` 和 `/api/agent-cluster/analyze`，未接后端时也能完成聊天与 Agent 协作展示。
- **本地启动**：`启动演示.bat` 一键启动，也可 `node _local-server.js` 起本地服务器。

## 数字人形象一览

| 形象 | 类型 | 说明 |
| --- | --- | --- |
| 元安 | Live2D | 默认主形象 · 温柔学姐 |
| 元瑶 | 静态 JPG | 换装少女形象 · 离线稳定展示 |
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

**方式一 · 双击启动**：直接运行 `启动演示.bat`。

**方式二 · Node 本地服务器**：

```bash
node _local-server.js 8321
```

浏览器访问 <http://localhost:8321>，即可体验完整流程：登录 → Agent 协作 → 数字人陪伴 → 语音聊天 → 我的空间换装 → API 配置。

> API 配置说明：演示阶段可以不填写 API Key，本地服务会使用可展示的离线回复。若填写真实 Key，配置会保存在本机浏览器 `localStorage` 中；正式部署建议把真实 Key 放在后端代理服务里。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| Live2D | pixi-live2d-display + Live2D Cubism Core |
| VRM 3D | three.js + @pixiv/three-vrm |
| 页面框架 | 原生 HTML / CSS / JavaScript |
| 语音 | Web Speech API（浏览器内置中文音色） |
| 状态存储 | localStorage（角色、装扮、心情跨页同步） |
| 本地服务 | Node.js 零依赖静态服务器 |

## 演示与验收重点

- 默认打开优先展示元安 Live2D，角色切换中元瑶静态形象用于离线稳定展示。
- 雨天场景为轻量氛围效果，雨丝密度和音量已降低，避免遮挡数字人。
- Agent 协作页保留后端接口契约；本地服务器已提供可用 mock 接口，断网仍可演示。
- `integrations/digital-human-demo/model/live2d/shizuku/sounds/` 中少量 mp3 为历史示例动作音效占位，不属于核心语音能力；核心语音以语音页和 API/浏览器语音能力为准。

## 版本历程

| 版本 | 时间 | 做了什么 |
| --- | --- | --- |
| V1.0 | 2026-07 | 第一阶段整合成品：首页 / 登录 / 我的空间 / 数字人 / 成长中心 / 状态问卷 6 页静态交互原型，海洋暖光单主题，融合第一阶段 11 位成员作品（戴昀瑾首页、许薛懿登录水帘、王嘉倪空间与成长、石若曦数字人、GAD-7 问卷等）。 |
| V1.2 | 2026-08 | 第二阶段首轮整合：扩展为 8 页，加入订阅制会员、双主题（海洋 / 莫兰迪）、星贝钱包跨页同步、Agent 集群页、语音谈心页。 |
| V1.3 | 2026-08 | 9 页版：补齐三主题（海洋 / 莫兰迪 / 深海深色），Agent 页升级 6-Agent 链（含记忆画像）与安全分流，登录页琴弦水帘交互发声，问卷增加最短停留与高分危机阻断（12356 热线），我的空间上线星轨抽卡（80 保底）、直购与签到。 |
| V1.4 | 2026-08 | 第三阶段数字人深化：数字人形象正式上线，换装系统（小舟 / 爱丽丝 3D 装扮），语音对话表情联动，陪伴页数字人入口。 |
| V1.5 | 2026-08 | 完整整合版：四类数字人统一渲染（Live2D / VRM / 视频 / 静态兜底），8 个形象，装扮与名字跨页联动，语音与音色预设，心情调色盘，API 配置页，本地服务器与离线兜底，MIT LICENSE 与站点检查 CI。 |
| V1.6 | 2026-08 | 当前版：新增元瑶静态换装形象（9 张皮肤），VRM 3D 配饰（蝴蝶结 / 猫耳 / 星星手杖 / 圆框眼镜），环境场景联动（白天 / 黑夜 / 雨天，含 3D 雨丝与雨声），全局角色同步升级到 `neuromate-avatar-mode-v16` 并兼容旧版，本地新增 `/api/agent-cluster/analyze` mock 接口，恢复首页视频，雨天效果轻量化保证人物清晰。 |

## 项目结构

```text
neuromate/
├── index.html             首页（项目介绍 + 首屏视频）
├── companion.html         数字人陪伴页（主舞台 + 形象切换）
├── voice-chat.html        语音页（音色与角色同步）
├── space.html             我的空间（角色卡 + 装扮）
├── membership.html        会员与星贝
├── api-config.html        API 配置
├── companion-renderer.js  数字人统一渲染器
├── site-avatar-registry.js 全局角色注册表
├── integrations/
│   └── digital-human-demo/  Live2D / VRM 渲染与模型
├── models/                VRM 模型
├── docs/screenshots/      README 截图
└── .github/workflows/     站点完整性检查（CI）
```

## 相关文档

- [README-V1.6-完整整合说明.md](README-V1.6-完整整合说明.md) — 版本演进、兼容性与已知限制

## License

[MIT](LICENSE) © 2026 元知己项目组
