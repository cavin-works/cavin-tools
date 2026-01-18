# 样式问题分析报告

## 🔍 问题概述

在迁移到新的主题系统后,发现**多个组件仍在使用硬编码颜色类**,导致:
1. 主题切换时样式不生效
2. 深色模式下视觉不一致
3. 配色主题无法完全应用

## ⚠️ 已发现的问题文件

### 1. 视频编辑器模块 (已修复 ✅)

#### `src/tools/video/editor/components/ControlPanel/ControlPanel.tsx`
**问题**: 使用硬编码颜色类
```tsx
// ❌ 错误 (已修复)
<div className="bg-white dark:bg-neutral-800">
<div className="border-b border-neutral-200 dark:border-neutral-700">
className="text-gray-600 dark:text-gray-400"

// ✅ 正确 (已修复为)
<div className="bg-card border border-border">
<div className="border-b border-border">
className="text-muted-foreground"
```

#### `src/tools/video/editor/index.tsx`
**问题**: 主页面和拖拽区域使用硬编码颜色
```tsx
// ❌ 错误 (已修复)
<div className="bg-neutral-50 dark:bg-neutral-900">
<div className="bg-black dark:bg-neutral-100 text-white dark:text-neutral-900">

// ✅ 正确 (已修复为)
<div className="bg-background">
<div className="bg-primary text-primary-foreground">
```

### 2. 图片工具模块 (已修复 ✅)

#### `src/tools/image/compressor/index.tsx`
#### `src/tools/image/converter/index.tsx`
**问题**: 使用 `bg-neutral-50 dark:bg-neutral-900`

**修复**: 已统一为 `bg-background`

### 3. 进程管理器模块 (部分修复 ⚠️)

#### `src/tools/dev/process-manager/index.tsx`
**问题**: 大量使用 `gray-*` 颜色类而非 `neutral-*` 或 CSS 变量

**需要修复的区域**:
```tsx
// 第46行 - 主容器
<div className="h-full flex flex-col bg-white dark:bg-gray-900">

// 第48行 - 头部边框
<div className="p-6 border-b border-gray-200 dark:border-gray-700">

// 第51行 - 图标容器
<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">

// 第55行 - 标题
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">

// 第58行 - 描述文字
<p className="text-sm text-gray-500 dark:text-gray-400">

// 第68-72行 - 按钮状态
className={`... ${
  autoRefresh
    ? 'bg-green-500 text-white dark:bg-green-600'
    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}`}

// 第79-82行 - 刷新按钮
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white ...">

// 第95-114行 - 错误提示
<div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 ...">

// 第142-168行 - 底部统计栏
<div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 ...">
```

#### `src/tools/dev/process-manager/components/ProcessList.tsx`
**问题**: 表格使用 `gray-*` 颜色类 (部分已修复)

**已修复**:
- 空状态文字颜色
- 表格标题颜色
- 表格边框颜色
- 行悬停背景色

#### `src/tools/dev/process-manager/components/SearchBar.tsx`
**需要检查**: 可能也使用了 `gray-*` 颜色类

#### `src/tools/dev/process-manager/components/PortList.tsx`
**需要检查**: 可能也使用了 `gray-*` 颜色类

### 4. 其他可能存在问题的文件

#### `src/tools/video/editor/components/Timeline/Timeline.tsx`
**需要检查**: 可能存在硬编码颜色

#### `src/tools/video/editor/components/VideoInfo/index.tsx`
**需要检查**: 可能存在硬编码颜色

#### `src/tools/image/background-remover/index.tsx`
**需要检查**: 大量自定义样式,未使用 shadcn 组件

## 🎯 颜色类映射表

### 应该避免使用的类 ❌

| 旧的硬编码类 | 新的 CSS 变量类 | 说明 |
|-------------|----------------|------|
| `bg-white` | `bg-background` 或 `bg-card` | 背景色 |
| `dark:bg-neutral-900` | `bg-background` | 深色背景 |
| `text-neutral-900` | `text-foreground` | 前景文字 |
| `dark:text-white` | `text-foreground` | 自动适配 |
| `text-neutral-500` | `text-muted-foreground` | 次要文字 |
| `bg-neutral-100` | `bg-muted` 或 `bg-accent` | 浅色背景 |
| `border-neutral-200` | `border-border` | 边框 |
| `bg-blue-500` | `bg-primary` | 主色按钮 |
| `text-blue-600` | `text-primary` | 主色文字 |
| `bg-gray-*` | 改用 `neutral-*` 或 CSS 变量 | 避免使用 gray |

### 推荐使用的 CSS 变量类 ✅

| CSS 变量类 | 用途 | OKLCH 值 (示例) |
|-----------|------|----------------|
| `bg-background` | 页面背景 | `oklch(1 0 0)` (浅色) |
| `text-foreground` | 主要文字 | `oklch(0.141 ...)` |
| `bg-card` | 卡片背景 | `oklch(1 0 0)` |
| `text-card-foreground` | 卡片文字 | `oklch(0.141 ...)` |
| `bg-primary` | 主色背景 | 根据主题变化 |
| `text-primary` | 主色文字 | 根据主题变化 |
| `text-primary-foreground` | 主色按钮文字 | `oklch(0.97 ...)` |
| `bg-muted` | 弱化背景 | `oklch(0.967 ...)` |
| `text-muted-foreground` | 弱化文字 | `oklch(0.552 ...)` |
| `bg-accent` | 强调背景 | `oklch(0.967 ...)` |
| `text-accent-foreground` | 强调文字 | `oklch(0.21 ...)` |
| `border-border` | 边框 | `oklch(0.92 ...)` |
| `bg-destructive` | 危险操作 | `oklch(0.577 ...)` |

## 🔧 修复步骤

### 1. 查找所有问题文件

```bash
# 查找使用 bg-white 的文件
rg "bg-white" src --type tsx

# 查找使用 gray-* 的文件
rg "text-gray-|bg-gray-|border-gray-" src --type tsx

# 查找使用硬编码 neutral-* 的文件
rg "bg-neutral-[0-9]|text-neutral-[0-9]" src --type tsx
```

### 2. 系统性替换

为每个文件执行以下替换 (可使用编辑器的查找替换功能):

#### 背景色
```tsx
// 页面背景
bg-neutral-50 dark:bg-neutral-900  →  bg-background
bg-white dark:bg-neutral-800       →  bg-card

// 弱化背景
bg-neutral-100 dark:bg-neutral-800  →  bg-muted
bg-neutral-100 dark:bg-neutral-700  →  bg-accent
```

#### 文字颜色
```tsx
// 主要文字
text-neutral-900 dark:text-white         →  text-foreground
text-neutral-900 dark:text-neutral-100   →  text-foreground

// 次要文字
text-neutral-500 dark:text-neutral-400   →  text-muted-foreground
text-neutral-600 dark:text-neutral-400   →  text-muted-foreground
```

#### 边框
```tsx
border-neutral-200 dark:border-neutral-700  →  border-border
border-neutral-300 dark:border-neutral-600  →  border-border
```

#### 主色
```tsx
bg-blue-500        →  bg-primary
text-blue-600      →  text-primary
text-white         →  text-primary-foreground (在主色背景上)
```

#### 特殊颜色 (gray 系列)
```tsx
// 统一改为 neutral 或 CSS 变量
text-gray-500 dark:text-gray-400  →  text-muted-foreground
bg-gray-50 dark:bg-gray-800       →  bg-muted
border-gray-200 dark:border-gray-700  →  border-border
```

### 3. 测试验证

修复后需要测试:
1. 在 5 种配色主题下查看
2. 分别在浅色和深色模式下查看
3. 确保所有交互状态 (hover, active, disabled) 都正常

## 📋 修复优先级

### P0 (高优先级 - 影响核心功能)
- [x] 视频编辑器 ControlPanel (已修复)
- [x] 视频编辑器主页面 (已修复)
- [x] 图片压缩器主页面 (已修复)
- [x] 图片转换器主页面 (已修复)
- [ ] 进程管理器主页面 (待修复)
- [ ] 进程管理器 SearchBar (待修复)

### P1 (中优先级 - 影响视觉一致性)
- [x] ProcessList 部分 (已修复)
- [ ] PortList (待修复)
- [ ] Timeline 组件 (待检查)
- [ ] VideoInfo 组件 (待检查)

### P2 (低优先级 - 次要组件)
- [ ] 背景去除器 (待整体重构)
- [ ] 其他未发现的组件

## 🎨 最佳实践

### DO ✅

1. **使用 CSS 变量类**
```tsx
<div className="bg-background text-foreground">
  <Card className="bg-card">
    <Button className="bg-primary text-primary-foreground">
      操作
    </Button>
  </Card>
</div>
```

2. **使用 shadcn 组件**
```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

<Card>
  <CardContent>
    <Button>操作</Button>
  </CardContent>
</Card>
```

3. **使用设计令牌**
```tsx
import { designTokens } from '@/core/theme/designTokens';

<div style={{
  padding: designTokens.spacing.card,
  borderRadius: designTokens.radius.lg
}}>
```

### DON'T ❌

1. **不要硬编码颜色**
```tsx
// ❌ 错误
<div className="bg-white dark:bg-neutral-900">
<button className="bg-blue-500 hover:bg-blue-600">

// ❌ 错误 - 内联样式
<div style={{ backgroundColor: '#ffffff' }}>
```

2. **不要使用 gray-* 系列**
```tsx
// ❌ 错误 - gray 和 neutral 混用
<div className="text-gray-600 dark:text-gray-400">
<div className="border-gray-200">

// ✅ 正确 - 统一使用 CSS 变量
<div className="text-muted-foreground">
<div className="border-border">
```

3. **不要跳过 shadcn 组件**
```tsx
// ❌ 错误 - 自己实现按钮
<button className="px-4 py-2 bg-blue-500 text-white rounded">

// ✅ 正确 - 使用 shadcn Button
<Button>操作</Button>
```

## 🔄 持续优化

### 建立代码审查清单

每次 PR 前检查:
- [ ] 无 `bg-white` 或 `dark:bg-*-900` 硬编码
- [ ] 无 `text-neutral-[数字]` 硬编码
- [ ] 无 `gray-*` 颜色类
- [ ] 优先使用 shadcn 组件
- [ ] 所有新颜色使用 CSS 变量

### 自动化检测

可以添加 ESLint 规则来禁止硬编码颜色:

```js
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/bg-white|bg-neutral-[0-9]|text-neutral-[0-9]/]',
      message: '请使用 CSS 变量类 (bg-background, text-foreground 等)'
    }
  ]
}
```

## 📊 进度追踪

- **已修复**: 6 个文件
- **待修复**: ~10 个文件
- **完成度**: ~40%

---

**最后更新**: 2026-01-18
**负责人**: AI Assistant
**状态**: 进行中 🟡
