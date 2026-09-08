# 元知己 V1.6 大屏预览

这个目录保留为数字人的大屏预览窗口。它不是最终站点的独立入口，正式操作流程仍然从根目录的 `companion.html` 进入。

## 当前保留内容

- 6 个形象：元安、元晴、元澈、虹色Mao、元元熊猫、元初。
- 默认读取全站角色选择：`neuromate-avatar-mode-v16`，并兼容旧版 `neuromate-avatar-mode-v15`。
- 支持 Live2D、视频、静态兜底。
- 支持状态口型、安静陪伴、本地记忆、API 配置。

## 已删除内容

- 原水滴形象、对应按钮和动效已先删除。
- 前台不再显示具体同学姓名，角色说明只保留模型类型和素材类型。

## 打开方式

推荐从主站进入：

```text
http://127.0.0.1:8765/companion.html
```

在数字人页点击“大屏预览”即可打开：

```text
http://127.0.0.1:8765/integrations/digital-human-demo/index.html
```

不要直接双击本目录 HTML。Live2D、VRM 和 ES Module 需要通过本地 HTTP 服务加载。
