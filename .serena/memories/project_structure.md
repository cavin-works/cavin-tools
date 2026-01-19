# 项目结构

## 根目录结构

```
cavin-tools/
├── src/                  # React 前端源代码
├── src-tauri/            # Rust 后端代码
├── public/               # 静态资源
├── resources/            # 应用资源（图标等）
├── docs/                 # 项目文档
├── scripts/              # 构建脚本
├── .github/              # GitHub Actions 配置
├── dist/                 # 构建输出目录
├── node_modules/         # Node 依赖
├── index.html            # 入口 HTML
├── package.json          # NPM 配置
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 配置
├── tauri.conf.json       # Tauri 配置（在 src-tauri/）
├── components.json       # shadcn/ui 配置
├── postcss.config.js     # PostCSS 配置
├── commitlint.config.js  # Commitlint 配置
├── .releaserc.js         # Semantic Release 配置
└── CHANGELOG.md          # 更新日志
```

## 源代码结构 (src/)

```
src/
├── main.tsx              # React 入口文件
├── styles.css            # 全局样式（Tailwind CSS 4.x 配置 + 主题系统）
├── vite-env.d.ts         # Vite 类型定义
│
├── tools/                # 工具模块
│   ├── video/            # 视频处理工具
│   │   └── editor/
│   │       ├── components/
│   │       │   ├── ControlPanel/      # 控制面板（压缩/变速/截断/GIF等）
│   │       │   ├── ProgressBar/       # 进度条
│   │       │   ├── VideoInfo/         # 视频信息展示
│   │       │   └── Timeline/          # 时间轴
│   │       ├── contexts/              # React Context
│   │       ├── store/                 # Zustand 状态管理
│   │       ├── types/                 # TypeScript 类型定义
│   │       ├── utils/                 # 工具函数
│   │       ├── tool.config.ts         # 工具配置
│   │       └── index.tsx              # 工具主组件
│   │
│   ├── image/            # 图像处理工具
│   │   ├── converter/      # 图片转换器
│   │   ├── compressor/     # 图片压缩器
│   │   ├── watermark-remover/  # 水印去除
│   │   ├── background-remover/ # 背景去除
│   │   ├── editor/         # 图片编辑器
│   │   ├── collage/        # 图片拼贴
│   │   └── batch/          # 批量处理
│   │
│   ├── dev/              # 开发工具
│   │   └── process-manager/  # 进程管理器
│   │
│   └── text/             # 文本处理工具
│       └── character-tools/   # 字符工具
│
├── core/                 # 核心功能
│   ├── settings/         # 设置页面
│   │   └── components/    # 设置组件
│   ├── store/            # 全局应用状态（Zustand）
│   ├── layout/           # 布局组件
│   │   ├── AppLayout.tsx    # 主布局
│   │   ├── Sidebar.tsx       # 侧边栏
│   │   └── MainContent.tsx   # 主内容区
│   ├── theme/            # 主题配置
│   │   ├── themeConfig.ts    # 主题配置
│   │   └── designTokens.ts   # 设计令牌
│   └── tool-registry/    # 工具注册系统
│       ├── ToolMetadata.ts   # 工具元数据接口
│       └── toolRegistry.ts  # 工具注册表
│
├── shared/               # 共享资源
│   ├── components/       # UI 组件库（shadcn/ui）
│   │   ├── ui/          # 可复用 UI 组件
│   │   └── ...
│   ├── styles/          # 共享样式
│   ├── hooks/           # 自定义 Hooks
│   └── utils/           # 工具函数
│       └── utils.ts     # 通用工具（cn 等）
│
└── test/                # 测试配置
    └── setup.ts         # 测试环境配置
```

## 后端结构 (src-tauri/)

```
src-tauri/
├── src/                 # Rust 源代码
├── Cargo.toml           # Rust 依赖配置
├── tauri.conf.json      # Tauri 应用配置
├── icons/               # 应用图标
│   ├── icon.png
│   └── icon.ico
└── ...
```

## 工具目录模式

每个工具遵循统一的目录结构：

```
{tool}/
├── components/           # 工具专用组件
│   ├── ComponentName.tsx
│   └── index.ts
├── store/                # Zustand 状态管理
│   └── toolStore.ts
├── types/                # TypeScript 类型
│   └── index.ts
├── utils/                # 工具函数
│   ├── helper.ts
│   └── ...
├── tool.config.ts        # 工具配置（注册信息）
└── index.tsx             # 工具主组件
```

## 关键配置文件

| 文件 | 用途 |
|------|------|
| `package.json` | NPM 包依赖、脚本命令 |
| `tsconfig.json` | TypeScript 编译配置 |
| `vite.config.ts` | Vite 构建工具配置 |
| `components.json` | shadcn/ui 组件配置 |
| `postcss.config.js` | PostCSS 插件配置 |
| `commitlint.config.js` | Git 提交信息规范 |
| `.releaserc.js` | 自动化版本发布配置 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置 |
| `src/styles.css` | 全局样式和主题系统 |

## 静态资源

```
public/          # 公共静态资源
resources/       # Tauri 应用资源（图标、splash等）
```

## 构建输出

```
dist/            # Vite 构建输出
src-tauri/target/ # Rust 构建输出
```
