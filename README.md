<div align="center">

# 元知己 Neuromate

**校园 AI 情绪陪伴应用 · V1.5 完整整合版**

[![Version](https://img.shields.io/badge/Version-V1.5%20%E6%95%B4%E5%90%88%E7%89%88-blueviolet)](https://github.com/xm2284/neuromate)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Site Check](https://img.shields.io/github/actions/workflow/status/xm2284/neuromate/ci.yml?label=Site%20Check)](https://github.com/xm2284/neuromate/actions)
[![Stars](https://img.shields.io/github/stars/xm2284/neuromate)](https://github.com/xm2284/neuromate)
[![Repo Size](https://img.shields.io/github/repo-size/xm2284/neuromate)](https://github.com/xm2284/neuromate)

一个面向校园场景的 AI 情绪陪伴应用。7 个数字人形象、装扮、语音与心情系统完整整合，**纯前端本地运行，双击即用**。

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
    <td align="center"><b>API 配置</b> · 本地保存、不落真实 Key</td>
  </tr>
</table>

## 核心特性

- **四类数字人统一渲染**：Live2D、VRM 3D、视频、静态兜底，由 `companion-renderer.js` 统一接管，加载失败自动回退，不留空框。
- **全局角色同步**：角色选择写入 `neuromate-avatar-mode-v15`，数字人页、语音页、我的空间读取同一份选择。
- **装扮系统**：元熙 VRM 保留小舟、爱丽丝两个 3D 装扮位，换装实时同步回数字人页。
- **语音与音色**：语音页跟随当前角色，状态文案、气泡头像、音色预设同步切换，支持语速 / 音高调节。
- **心情与状态**：心情调色盘联动背景、语录、输入提示与数字人反馈，最近一次心情持久化保存。
- **API 可配置**：独立配置页填写 / 保存 / 测试后端接口，前端不落真实 Key。
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

**方式一 · 双击启动**：直接运行 `启动演示.bat`。

**方式二 · Node 本地服务器**：

```bash
node _local-server.js 8321
```

浏览器访问 <http://localhost:8321>，即可体验完整流程：登录 → 数字人陪伴 → 语音聊天 → 我的空间换装 → API 配置。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| Live2D | pixi-live2d-display + Live2D Cubism Core |
| VRM 3D | three.js + @pixiv/three-vrm |
| 页面框架 | 原生 HTML / CSS / JavaScript |
| 语音 | Web Speech API（浏览器内置中文音色） |
| 状态存储 | localStorage（角色、装扮、心情跨页同步） |
| 本地服务 | Node.js 零依赖静态服务器 |

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

- [README-V1.5-完整整合说明.md](README-V1.5-完整整合说明.md) — 版本演进、兼容性与已知限制

## License

[MIT](LICENSE) © 2026 元知己项目组
