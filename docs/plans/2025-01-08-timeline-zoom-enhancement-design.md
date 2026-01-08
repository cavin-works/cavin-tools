# 时间轴缩放功能增强设计

**日期**: 2025-01-08
**设计师**: Claude
**状态**: 设计完成

## 一、需求概述

### 当前问题
- 时间轴缩放范围仅支持 1x-5x，只能放大无法缩小
- 用户无法快速浏览长视频的整体结构
- 缩放控制不够灵活

### 设计目标
- 支持 0.1x-10x 的缩放范围，满足快速浏览长视频的需求
- 提供流畅的缩放交互体验（鼠标滚轮 + 按钮）
- 保持现有用户习惯，平滑过渡

## 二、缩放级别设计

### 非线性缩放级别

```typescript
const ZOOM_LEVELS = [
  0.1,   // 1/10 - 极简览视图
  0.25,  // 1/4
  0.5,   // 1/2
  0.75,  // 3/4
  1.0,   // 标准（默认）
  1.5,   // 1.5倍
  2.0,   // 2倍
  3.0,   // 3倍
  5.0,   // 5倍
  10.0   // 10倍 - 精细编辑
];
```

**约束条件：**
- 最小值：0.1x（防止视频过小无法操作）
- 最大值：10x（防止过度放大导致性能问题）

### 智能初始缩放

根据视频时长自动设置初始缩放级别：

```typescript
function getInitialZoomForVideo(duration: number): number {
  if (duration < 60) return 1.0;      // 短视频（< 1分钟）
  if (duration < 300) return 0.5;    // 中等视频（1-5分钟）
  return 0.25;                        // 长视频（> 5分钟）
}
```

## 三、交互设计

### 3.1 鼠标滚轮交互

**交互映射：**

| 操作 | 功能 |
|------|------|
| 正常滚轮 | 横向滚动时间轴（默认行为） |
| Shift + 滚轮 | 缩放时间轴 |
| Ctrl/Cmd + 滚轮 | 快速缩放（跳2级） |

**滚轮事件处理：**

```typescript
const handleWheel = (event: WheelEvent) => {
  // Shift + 滚轮 = 缩放
  if (event.shiftKey) {
    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    const step = event.ctrlKey || event.metaKey ? 2 : 1;
    const newIndex = Math.max(
      0,
      Math.min(
        ZOOM_LEVELS.length - 1,
        currentIndex + direction * step
      )
    );

    setZoomLevel(ZOOM_LEVELS[newIndex]);
    showZoomHint(); // 显示缩放提示
  }
  // 否则不阻止默认行为，允许横向滚动
};
```

### 3.2 按钮控制

**UI 布局：**

```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => handleZoomChange(-1)}
    disabled={zoomLevel <= ZOOM_LEVELS[0]}
    className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
  >
    -
  </button>
  <span className="text-sm text-gray-600 min-w-[3rem] text-center font-mono">
    {zoomLevel % 1 === 0 ? `${zoomLevel}x` : `${zoomLevel.toFixed(1)}x`}
  </span>
  <button
    onClick={() => handleZoomChange(1)}
    disabled={zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
    className="px-2 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
  >
    +
  </button>

  {/* 重置按钮 */}
  <button
    onClick={() => setZoomLevel(getInitialZoomForVideo(duration))}
    className="px-2 py-1 text-sm border rounded hover:bg-gray-100 text-gray-500"
    title="重置缩放"
  >
    ⟲
  </button>
</div>
```

**按钮行为：**
- 点击 "-"/"+" 按钮：按 ZOOM_LEVELS 数组递增/递减
- 达到边界时按钮禁用并变灰
- 点击重置按钮：恢复到视频初始推荐缩放级别

### 3.3 辅助交互

**鼠标中键拖拽滚动：**
- 按下鼠标中键在时间轴上拖拽 = 快速横向滚动
- 实现方式：监听 `mousedown`（button 1）+ `mousemove`

**触控板支持：**
- 双指横向滚动：原生支持，无需特殊处理

## 四、视觉反馈设计

### 4.1 缩放操作提示

**浮动提示UI：**

```tsx
{showZoomHint && (
  <div
    className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm z-50 transition-opacity duration-300"
    style={{ animation: 'fadeInOut 1500ms ease-out' }}
  >
    <div>
      {zoomLevel < 1 ? '🔍 缩小视图' : zoomLevel > 1 ? '🔍 放大视图' : '标准视图'}
    </div>
    <div className="text-xs opacity-75 mt-1">
      {zoomLevel % 1 === 0 ? `${zoomLevel}x` : `${zoomLevel.toFixed(1)}x`}
    </div>
  </div>
)}
```

- **显示时机**：缩放操作触发
- **自动消失**：1.5秒后淡出
- **动画**：淡入淡出效果

### 4.2 状态图标指示

在缩放数字旁边显示状态图标：

```tsx
{zoomLevel < 0.5 && (
  <span className="ml-1" title="缩小视图">🔍➖</span>
)}
{zoomLevel > 2 && (
  <span className="ml-1" title="放大视图">🔍➕</span>
)}
```

### 4.3 边界状态提示

- 达到最小/最大缩放时，按钮显示 tooltip：
  - 最小值："已是最小缩放（0.1x）"
  - 最大值："已是最大缩放（10x）"

### 4.4 首次使用引导

**引导提示：**

```tsx
{!hasUsedZoom && (
  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
    <div className="flex items-center gap-2">
      <span>💡</span>
      <span>Shift + 滚轮可以缩放时间轴</span>
    </div>
  </div>
)}
```

- **显示逻辑**：首次加载且未使用过缩放功能
- **消失条件**：
  - 3秒后自动消失
  - 用户点击"知道了"按钮（可选添加）
  - 用户使用过一次滚轮缩放后，设置 `localStorage` 标记

### 4.5 过渡动画

**CSS 动画：**

```css
.timeline-container {
  transition: width 300ms ease-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}
```

## 五、实现要点

### 5.1 状态管理

```typescript
const [zoomLevel, setZoomLevel] = useState<number>(() =>
  getInitialZoomForVideo(currentVideo.duration)
);
const [showZoomHint, setShowZoomHint] = useState(false);

// 首次使用检测
const [hasUsedZoom, setHasUsedZoom] = useState(() =>
  Boolean(localStorage.getItem('hasUsedTimelineZoom'))
);
```

### 5.2 防抖与性能

- 滚轮事件使用 `requestAnimationFrame` 确保渲染流畅
- 不需要额外的防抖延迟，实时响应更重要
- 缩放级别变化才触发重渲染，中间状态忽略

### 5.3 可访问性

- 按钮支持键盘操作（Tab 选中 + Enter/Space 触发）
- 添加 `aria-label` 属性描述按钮功能
- 缩放提示支持屏幕阅读器

## 六、测试计划

### 6.1 功能测试

- [ ] 缩放范围测试：0.1x ~ 10x 所有级别
- [ ] 按钮边界测试：最小/最大值禁用状态
- [ ] 滚轮缩放测试：正常、Shift、Ctrl/Cmd 组合
- [ ] 横向滚动测试：确保不影响默认滚动
- [ ] 重置按钮测试：恢复初始缩放级别

### 6.2 交互测试

- [ ] 快速连续缩放：确保流畅无卡顿
- [ ] 边界行为测试：超出范围的处理
- [ ] 提示显示测试：自动消失、手动触发
- [ ] 首次引导测试：localStorage 标记正确

### 6.3 视觉测试

- [ ] 过渡动画：宽度变化平滑
- [ ] 提示动画：淡入淡出自然
- [ ] 按钮状态：禁用样式清晰
- [ ] 响应式：不同窗口尺寸下正常工作

### 6.4 性能测试

- [ ] 长视频（> 30分钟）：缩放响应时间
- [ ] 快速连续缩放：帧率稳定性
- [ ] 内存占用：缩放前后无泄漏

## 七、未来扩展

### 可能的增强功能

1. **自定义缩放级别**：允许用户设置常用缩放预设
2. **缩放历史**：记录最近使用的缩放级别，快速切换
3. **多段缩放**：时间轴不同区域使用不同缩放级别
4. **手势支持**：触控设备上的捏合缩放手势

## 八、实施优先级

### P0（必须实现）
- [ ] 缩放范围扩展到 0.1x-10x
- [ ] 按钮控制（+/-/重置）
- [ ] Shift+滚轮缩放

### P1（重要）
- [ ] 首次使用引导
- [ ] 缩放操作提示
- [ ] 智能初始缩放

### P2（可选）
- [ ] Ctrl+滚轮快速缩放
- [ ] 状态图标指示
- [ ] 过渡动画优化

## 九、相关文件

- **主要修改**：`src/components/Timeline/Timeline.tsx`
- **样式文件**：可能需要新增 `src/components/Timeline/Timeline.css`
- **类型定义**：可能需要扩展 `src/types/timeline.ts`

## 十、验收标准

### 功能完整性
✅ 支持 0.1x-10x 缩放范围
✅ 按钮和滚轮两种控制方式都正常工作
✅ 边界状态正确处理
✅ 首次使用引导显示

### 用户体验
✅ 交互流畅，无卡顿
✅ 视觉反馈清晰及时
✅ 不影响横向滚动的默认行为
✅ 学习成本低，保持现有习惯

### 技术质量
✅ 无性能回归
✅ 代码可维护性好
✅ 充分的错误处理
✅ 通过所有测试用例
