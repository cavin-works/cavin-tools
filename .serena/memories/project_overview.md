# Cavin Tools 项目概述

## 项目目的

**Cavin Tools** 是一款基于 Tauri + Rust + React 的桌面工具集合应用，提供多种实用工具：

### 当前工具列表
- **视频编辑器** - 支持压缩、变速、截断、提取帧、GIF转换
- **图像转换器** - 图片格式转换工具
- **图像压缩器** - 图片压缩优化
- **水印去除** - 移除图片水印
- **背景去除** - 图片背景移除
- **进程管理器** - 开发者工具，管理系统进程
- **字符工具** - 文本处理工具（JSON格式化、MD5生成、Base64转换等）

## 技术栈

### 前端
- **框架**: React 18.3.1 + TypeScript 5.7.2
- **构建**: Vite 6.0.3
- **样式**: TailwindCSS 4.x (CSS-first 配置)
- **UI 组件**: shadcn/ui + Radix UI
- **状态管理**: Zustand 5.0.2
- **图标**: Lucide React
- **路由**: Tauri (单页应用)

### 后端
- **框架**: Tauri 2.x + Rust
- **视频处理**: FFmpeg

### 开发工具
- **测试**: Vitest + Testing Library
- **包管理**: pnpm (项目使用 ppm-lock.yaml)
- **版本管理**: semantic-release
- **提交规范**: commitlint (conventional commits)

## 项目版本

- **当前版本**: 0.0.8
- **发布流程**: 自动化语义化版本发布（semantic-release）
