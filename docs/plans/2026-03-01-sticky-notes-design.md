# Sticky Notes 便签工具设计文档

> 创建日期: 2026-03-01
> 状态: 待实现

## 1. 概述

### 1.1 产品定位

快速临时便签工具，类似桌面便利贴，强调轻量、快速、随时可用的体验。

### 1.2 核心特性

- **混合界面模式**: 主窗口管理 + 独立窗口撕下
- **桌面嵌入**: 支持半透明效果，融入桌面环境
- **快捷键置顶**: 全局快捷键快速唤起和置顶
- **极简功能**: 纯文本内容，基础增删改查
- **自定义主题**: 多种预设样式，支持自定义颜色
- **分类管理**: 支持文件夹/标签分类 + 状态筛选

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        便签系统架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │   主窗口模块     │     │   独立便签窗口   │               │
│  │  (便签管理页)    │────▶│   (撕下模式)    │               │
│  └────────┬────────┘     └────────┬────────┘               │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────────────────────────────────┐           │
│  │              Tauri Store (数据层)            │           │
│  │    - 便签内容、分类、状态、主题配置           │           │
│  └─────────────────────────────────────────────┘           │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────┐           │
│  │              Rust 后端服务                   │           │
│  │    - 全局快捷键监听                          │           │
│  │    - 窗口管理 (置顶/透明/桌面嵌入)            │           │
│  │    - 系统托盘集成                            │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 复用现有技术栈 |
| 状态管理 | Zustand | 复用现有技术栈 |
| 数据存储 | @tauri-apps/plugin-store | 复用现有插件 |
| 桌面框架 | Tauri 2.x | 复用现有框架 |
| 全局快捷键 | tauri-plugin-global-shortcut | 需新增依赖 |
| UI 组件 | Radix UI + Tailwind CSS | 复用现有组件库 |

---

## 3. 数据模型

### 3.1 类型定义

```typescript
// types/note.ts

/** 便签状态 */
export type NoteStatus = 'active' | 'completed' | 'archived';

/** 便签分类 */
export interface NoteCategory {
  id: string;
  name: string;
  color: string;  // 十六进制颜色
  createdAt: number;
}

/** 便签实体 */
export interface StickyNote {
  id: string;
  content: string;           // 纯文本内容
  categoryId: string | null; // 所属分类，null 表示未分类
  status: NoteStatus;

  // 窗口状态（仅撕下模式的便签有值）
  windowState?: {
    x: number;
    y: number;
    width: number;
    height: number;
    isDetached: boolean;      // 是否撕下为独立窗口
    isPinned: boolean;        // 是否置顶
    isDesktopMode: boolean;   // 是否桌面嵌入模式
    opacity: number;          // 透明度 0-1
  };

  // 主题配置
  theme: {
    backgroundColor: string;
    textColor: string;
    fontSize: 'sm' | 'md' | 'lg';
  };

  createdAt: number;
  updatedAt: number;
}

/** 全局配置 */
export interface StickyNotesConfig {
  defaultTheme: StickyNote['theme'];
  globalOpacity: number;        // 桌面嵌入默认透明度
  hotkeys: {
    quickCreate: string;        // 快速创建便签
    togglePinAll: string;       // 置顶/取消置顶所有便签
    showHideAll: string;        // 显示/隐藏所有便签
  };
  categories: NoteCategory[];
}
```

### 3.2 存储结构

```
sticky-notes.store.json
├── notes: StickyNote[]          // 所有便签
├── config: StickyNotesConfig    // 全局配置
└── version: number              // 数据版本号
```

---

## 4. 前端设计

### 4.1 目录结构

```
src/tools/sticky-notes/
├── index.tsx                    # 模块入口，路由注册
├── components/
│   ├── NoteCard.tsx             # 单个便签卡片（主窗口内）
│   ├── NoteEditor.tsx           # 便签编辑器（纯文本输入）
│   ├── NoteList.tsx             # 便签列表（支持筛选/排序）
│   ├── CategorySidebar.tsx      # 分类侧边栏
│   ├── StatusBarFilter.tsx      # 状态筛选栏
│   ├── ThemePicker.tsx          # 主题颜色选择器
│   └── modals/
│       ├── QuickCreateModal.tsx # 快捷键唤起的快速创建弹窗
│       └── SettingsModal.tsx    # 便签设置（快捷键配置等）
├── stores/
│   └── useNotesStore.ts         # 便签状态管理
├── hooks/
│   ├── useNoteWindow.ts         # 独立窗口操作 Hook
│   └── useHotkey.ts             # 快捷键监听 Hook
└── types/
    └── index.ts                 # 类型导出
```

### 4.2 组件职责

| 组件 | 职责 |
|------|------|
| `NoteCard` | 展示单个便签，支持内联编辑、撕下、删除、状态切换 |
| `NoteEditor` | 纯文本输入框，自动聚焦，支持 Ctrl+Enter 保存 |
| `NoteList` | 虚拟滚动列表，支持分类/状态筛选 |
| `CategorySidebar` | 分类树形结构，拖拽排序，右键菜单管理 |
| `QuickCreateModal` | 全局快捷键唤起，简洁输入框 + 快速选择分类 |

### 4.3 UI 布局

```
┌─────────────────────────────────────────────────────────┐
│  便签管理                          [新建便签] [设置]     │
├────────────┬────────────────────────────────────────────┤
│            │  状态筛选: [全部] [进行中] [已完成] [归档]   │
│  分类       ├────────────────────────────────────────────┤
│  ├─ 全部    │  ┌──────────────┐  ┌──────────────┐       │
│  ├─ 工作    │  │ 便签内容...   │  │ 便签内容...   │       │
│  ├─ 生活    │  │ [撕下] [完成] │  │ [撕下] [完成] │       │
│  └─ 学习    │  └──────────────┘  └──────────────┘       │
│             │  ┌──────────────┐  ┌──────────────┐       │
│  [+ 新分类] │  │ 便签内容...   │  │ 便签内容...   │       │
│             │  │ [撕下] [完成] │  │ [撕下] [完成] │       │
│             │  └──────────────┘  └──────────────┘       │
└────────────┴────────────────────────────────────────────┘
```

---

## 5. 后端设计

### 5.1 目录结构

```
src-tauri/src/sticky_notes/
├── mod.rs                  # 模块导出
├── commands.rs             # Tauri 命令定义
├── window_manager.rs       # 独立窗口管理
├── hotkey.rs               # 全局快捷键
└── tray.rs                 # 系统托盘集成
```

### 5.2 核心命令

```rust
// commands.rs

#[tauri::command]
async fn create_note(app: AppHandle, content: String, category_id: Option<String>) -> Result<StickyNote, String>;

#[tauri::command]
async fn update_note(app: AppHandle, note: StickyNote) -> Result<(), String>;

#[tauri::command]
async fn delete_note(app: AppHandle, note_id: String) -> Result<(), String>;

#[tauri::command]
async fn detach_note(app: AppHandle, note_id: String) -> Result<(), String>;
// 将便签撕下为独立窗口

#[tauri::command]
async fn attach_note(app: AppHandle, note_id: String) -> Result<(), String>;
// 将独立窗口便签收回主窗口

#[tauri::command]
async fn set_note_window_state(
    app: AppHandle,
    note_id: String,
    state: NoteWindowState
) -> Result<(), String>;
// 设置窗口状态：置顶、透明度、桌面模式等

#[tauri::command]
async fn toggle_pin_all(app: AppHandle, pinned: bool) -> Result<(), String>;
// 全局置顶/取消置顶所有独立便签窗口
```

### 5.3 窗口管理器

```rust
// window_manager.rs

pub struct NoteWindowManager {
    windows: HashMap<String, Window>,  // note_id -> Window
}

impl NoteWindowManager {
    /// 创建独立便签窗口
    pub fn create_detached_window(&mut self, note: &StickyNote) -> Result<Window>;

    /// 设置窗口属性（置顶、透明度、桌面嵌入）
    pub fn set_window_effects(&self, window: &Window, state: &NoteWindowState);

    /// 桌面嵌入模式：设置窗口为工具窗口样式，半透明背景
    pub fn enable_desktop_mode(&self, window: &Window, opacity: f32);
}
```

### 5.4 窗口效果配置

| 模式 | 置顶 | 透明背景 | 窗口类型 | 任务栏显示 |
|------|------|----------|----------|-----------|
| 普通撕下 | 可选 | 否 | Normal | 是 |
| 桌面嵌入 | 是 | 是（半透明） | Tool | 否 |
| 快捷键置顶 | 是 | 继承原设置 | 保持不变 | 是 |

---

## 6. 交互设计

### 6.1 快捷键配置

| 功能 | 默认快捷键 | 说明 |
|------|-----------|------|
| 快速创建便签 | `Ctrl+Shift+N` | 全局唤起快速创建弹窗 |
| 置顶/取消置顶所有 | `Ctrl+Shift+P` | 将所有独立便签窗口置顶或恢复 |
| 显示/隐藏所有便签 | `Ctrl+Shift+H` | 切换所有独立便签窗口可见性 |
| 保存便签（编辑中） | `Ctrl+Enter` | 保存当前编辑内容并关闭 |

### 6.2 快速创建便签流程

```
用户按下 Ctrl+Shift+N
        │
        ▼
┌───────────────────┐
│  Rust 监听全局快捷键 │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  发送事件到前端     │
│  quick-create事件  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  前端弹出 QuickCreateModal │
│  - 输入框自动聚焦          │
│  - 可选分类下拉            │
└─────────┬─────────┘
          │
    用户输入内容
          │
          ▼
┌───────────────────┐
│  Ctrl+Enter 保存   │
│  或点击"创建并撕下" │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  调用 create_note  │
│  存储到 Tauri Store │
└───────────────────┘
```

### 6.3 便签撕下/收回流程

```
点击便签卡片的"撕下"按钮
        │
        ▼
┌───────────────────┐
│  调用 detach_note  │
│  传递便签当前状态   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Rust 创建独立窗口  │
│  - 加载便签渲染页面  │
│  - 设置窗口位置/大小 │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  更新便签 windowState │
│  isDetached = true   │
└───────────────────┘

--- 收回流程 ---

点击独立窗口的"收回"按钮
        │
        ▼
┌───────────────────┐
│  调用 attach_note  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  关闭独立窗口       │
│  更新 windowState  │
│  isDetached = false │
└───────────────────┘
```

### 6.4 桌面嵌入模式流程

```
用户启用"桌面嵌入"开关
        │
        ▼
┌───────────────────┐
│  调用 set_note_window_state │
│  isDesktopMode = true       │
│  opacity = 0.85 (可配置)    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Rust 设置窗口效果  │
│  - always_on_top   │
│  - transparent bg  │
│  - skip_taskbar    │
│  - tool window type│
└───────────────────┘
```

---

## 7. 实现计划

### 7.1 阶段划分

| 阶段 | 内容 | 预估工时 | 依赖 |
|------|------|----------|------|
| **P0 基础框架** | 数据模型、Store 集成、基础组件 | 2-3h | - |
| **P1 主窗口管理** | 便签列表、分类管理、状态筛选 | 3-4h | P0 |
| **P2 独立窗口** | 撕下/收回、窗口管理器 | 3-4h | P1 |
| **P3 桌面嵌入** | 半透明效果、置顶、桌面模式 | 2-3h | P2 |
| **P4 全局快捷键** | 快捷键监听、快速创建弹窗 | 2h | P2 |
| **P5 主题系统** | 自定义主题、配置持久化 | 1-2h | P1 |

### 7.2 依赖添加

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-global-shortcut = "2.0"  # 全局快捷键
```

---

## 8. 技术要点

### 8.1 窗口透明效果

```rust
// 创建透明窗口的配置
let window = WebviewWindowBuilder::new(
    app,
    label,
    WebviewUrl::App("note/{note_id}".into())
)
.title("Sticky Note")
.inner_size(300.0, 200.0)
.decorations(false)           // 无边框
.transparent(true)            // 透明背景
.always_on_top(state.is_pinned)
.visible_on_all_workspaces(true)  // macOS 支持
.build()?;
```

### 8.2 全局快捷键

```rust
// 使用 tauri-plugin-global-shortcut
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

app.global_shortcut().on_shortcut("Ctrl+Shift+N", |app, _shortcut| {
    // 发送事件到前端
    app.emit("quick-create", ()).ok();
})?;
```

### 8.3 前端透明窗口样式

```css
/* 独立便签窗口的透明背景 */
.note-window {
  background-color: transparent;
}

.note-card {
  background-color: rgba(var(--note-bg), var(--opacity, 0.9));
  backdrop-filter: blur(10px);  /* 毛玻璃效果 */
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
```

---

## 9. 风险与备选方案

| 风险 | 影响 | 备选方案 |
|------|------|----------|
| 透明窗口跨平台兼容性问题 | 桌面嵌入体验不一致 | 提供普通模式作为降级方案 |
| 全局快捷键冲突 | 部分快捷键不可用 | 允许用户自定义快捷键 |
| 多窗口内存占用 | 性能影响 | 限制最大独立窗口数量 |

---

## 10. 后续扩展

以下功能不在当前版本范围内，可作为未来迭代方向：

- [ ] 云同步支持
- [ ] 便签内容搜索
- [ ] 便签导出/导入
- [ ] 协作共享
- [ ] 提醒通知
- [ ] 富文本/Markdown 支持
