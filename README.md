# Mnemosyne

一款基于 Tauri + Rust + React 的全能桌面工具箱，集成 AI 助手、视频编辑、图像处理等多种实用工具。

## 特性

### 🤖 AI 助手

- Claude Code, Codex, Gemini CLI 全能助手
- 统一供应商管理
- MCP 配置与管理
- 提示词库管理
- 技能管理与发现
- 代理服务与自动切换

### 🎬 视频编辑器

- 视频变速：支持 0.25x - 4x 速度调整
- 视频压缩：智能预设 + 高级参数控制
- 提取帧：单帧/间隔/批量提取
- 截断视频：精确裁剪或关键帧对齐
- 转 GIF：优化参数，智能建议

### 🖼️ 图像工具

- 图像转换器：多格式图片转换
- 图像压缩器：智能压缩优化
- 水印去除：AI 驱动的水印移除
- 背景去除：智能背景移除

### 🛠️ 开发工具

- 进程管理器：系统进程监控与管理
- 字符工具：JSON 格式化、MD5 生成、Base64 转换等

## 技术栈

### 前端

- **框架**: React 18.3.1 + TypeScript 5.7.2
- **构建**: Vite 7.3.0
- **样式**: TailwindCSS 4.x
- **UI 组件**: shadcn/ui + Radix UI
- **状态管理**: Zustand 5.0.2
- **动画**: Framer Motion 12.23.25

### 后端

- **框架**: Tauri 2.8.0 + Rust
- **视频处理**: FFmpeg

## 开发

### 前置要求

- Node.js 18+
- Rust 1.70+
- pnpm 10+

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run tauri:dev
```

### 构建

```bash
pnpm run tauri:build
```

## 许可证

MIT

## 名称由来

**Mnemosyne**（谟涅摩叙涅）是希腊神话中的记忆女神，九位缪斯之母。

选择这个名字是因为本工具集：

- 保存和管理各种知识（提示词、技能、配置）
- 提供智能辅助能力
- 作为创造力（缪斯）的源头

寓意：**将知识永久保存，随时唤醒回忆，辅助创造力迸发**。

## 致谢

- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [FFmpeg](https://ffmpeg.org/)
