# 图片编辑器混合架构设计方案

**日期**: 2026-01-16
**类型**: 功能设计
**状态**: 已批准

## 概述

基于 react-img-editor 的设计理念，使用 Canvas + React DOM 混合架构重构图片编辑器，实现完整的图层管理系统、绘图工具和图片变换功能。

## 核心需求

1. **基础绘图工具**: 画笔、矩形、圆形、箭头等形状工具
2. **图层管理系统**: 多图层支持、图层变换控制、图层面板UI
3. **图片变换功能**: 裁剪、旋转、翻转、缩放

## 技术架构

### 架构选型：Canvas + DOM 混合实现

**核心理念**: 渲染层使用纯Canvas获得最佳性能，对象管理和交互使用React组件提升开发效率。

### 三层架构

#### 1. 渲染层 - Canvas绘制引擎

**职责**:
- 单个主Canvas元素负责所有视觉内容绘制
- 使用离屏Canvas缓存复杂图层
- 实现脏矩形刷新机制，只重绘变化区域

**实现**:
```typescript
class CanvasRenderer {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;

  render(layers: Layer[], viewport: Viewport): void
  renderLayer(layer: Layer): void
  clearDirtyRegion(bounds: Bounds): void
}
```

#### 2. 交互层 - React组件 + 事件处理

**职责**:
- 透明Canvas覆盖层捕获所有鼠标事件
- React组件渲染控制手柄（选择框、旋转手柄、缩放点）
- DOM元素实现文本输入、颜色选择器等原生交互

**实现**:
```tsx
<InteractionCanvas onMouseDown={...} onMouseMove={...} />
<SelectionHandles bounds={...} onResize={...} onRotate={...} />
<TextInputOverlay position={...} onComplete={...} />
```

#### 3. 管理层 - React UI组件

**职责**:
- 图层面板：显示、排序、编辑图层
- 工具栏：选择工具、设置参数
- 属性面板：编辑选中对象属性

## 数据结构设计

### 图层数据结构

```typescript
interface Layer {
  id: string;
  type: 'image' | 'shape' | 'text' | 'drawing' | 'mosaic';
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;

  // 变换属性
  transform: {
    x: number;          // 位置
    y: number;
    width: number;      // 尺寸
    height: number;
    rotation: number;   // 旋转角度（度）
    scaleX: number;     // 缩放比例
    scaleY: number;
  };

  // 类型特定数据
  data: LayerData;

  // 性能优化
  cache?: HTMLCanvasElement;  // 离屏Canvas缓存
  dirty: boolean;             // 是否需要重绘
}

// 各类型图层的数据
type LayerData =
  | ImageData        // { imageElement: HTMLImageElement }
  | ShapeData        // { shapeType, fillColor, strokeColor, ... }
  | TextData         // { text, fontSize, fontFamily, ... }
  | DrawingData      // { points: Point[], strokeWidth, ... }
  | MosaicData;      // { pixelSize, sourceRegion, ... }
```

### 绘图工具类型

```typescript
type Tool =
  | 'select'      // 选择和变换工具
  | 'pen'         // 画笔
  | 'highlighter' // 荧光笔
  | 'rectangle'   // 矩形
  | 'circle'      // 圆形
  | 'arrow'       // 箭头
  | 'text'        // 文字
  | 'mosaic'      // 马赛克
  | 'crop';       // 裁剪
```

## 核心功能模块

### 1. 图层系统

#### 图层渲染流程

```
1. 遍历所有 visible=true 的图层，按 zIndex 排序
2. 对于 dirty=true 的图层：
   - 重新绘制到离屏Canvas
   - 缓存结果到 layer.cache
   - 设置 dirty=false
3. 将缓存的Canvas按顺序绘制到主Canvas
4. 应用图层的 transform（位置、缩放、旋转）
5. 应用 opacity
```

#### 图层管理功能

- ✅ 添加/删除图层
- ✅ 图层重命名
- ✅ 拖拽调整zIndex顺序
- ✅ 切换可见性（眼睛图标）
- ✅ 锁定/解锁（锁定图标）
- ✅ 调整不透明度（滑块）
- ✅ 显示图层缩略图

#### 图层面板UI

```tsx
<LayerPanel>
  {layers.map(layer => (
    <LayerItem
      key={layer.id}
      layer={layer}
      thumbnail={generateThumbnail(layer)}
      onToggleVisible={...}
      onToggleLock={...}
      onChangeOpacity={...}
      onDelete={...}
      onRename={...}
    />
  ))}
</LayerPanel>
```

### 2. 绘图工具系统

#### 选择工具 (Select)

**功能**:
- 点击选中图层对象
- 拖拽移动对象
- 显示8个缩放控制点 + 旋转手柄
- 多选支持（Ctrl/Cmd + 点击）

**实现**:
```typescript
// 碰撞检测
function hitTest(point: Point, layers: Layer[]): Layer | null {
  // 从上到下遍历（zIndex倒序）
  // 检查点是否在图层的变换后bounds内
  // 返回被点击的图层
}

// 拖拽处理
function handleDrag(delta: Point, layer: Layer) {
  layer.transform.x += delta.x;
  layer.transform.y += delta.y;
  layer.dirty = true;
}
```

#### 绘图工具 (Drawing Tools)

**画笔 (Pen)**:
- 自由绘制路径
- 实时跟随鼠标，绘制平滑曲线
- 完成后创建drawing类型图层

**形状工具 (Shapes)**:
- 矩形、圆形、直线、箭头
- 鼠标按下记录起点 → 移动预览 → 松开确认
- 完成后创建shape类型图层

**绘制流程** (以矩形为例):
```
1. MouseDown: 记录起始点 startPoint
2. MouseMove: 计算矩形bounds，在临时层绘制预览
3. MouseUp: 创建矩形图层对象
   - bounds = { x, y, width, height }
   - data = { shapeType: 'rectangle', fillColor, strokeColor }
4. 清除临时绘制状态
5. 触发Canvas重绘
```

#### 文字工具 (Text)

**实现**:
- 点击位置显示React文本输入框（绝对定位）
- 支持字体选择、大小、颜色、粗细
- 确认后创建text类型图层
- 文字渲染使用 `ctx.fillText()` / `ctx.strokeText()`

#### 马赛克工具 (Mosaic)

**实现**:
```typescript
function applyMosaic(
  sourceCanvas: HTMLCanvasElement,
  region: Bounds,
  pixelSize: number
): HTMLCanvasElement {
  // 1. 提取区域图像数据
  const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);

  // 2. 像素化处理
  for (let y = 0; y < region.height; y += pixelSize) {
    for (let x = 0; x < region.width; x += pixelSize) {
      // 取样块平均颜色
      const avgColor = calculateAverageColor(imageData, x, y, pixelSize);
      // 填充整个块
      fillBlock(imageData, x, y, pixelSize, avgColor);
    }
  }

  // 3. 返回处理后的Canvas
  return createCanvasFromImageData(imageData);
}
```

### 3. Canvas渲染引擎

#### 渲染管线

```typescript
class CanvasRenderer {
  // 主渲染流程
  render(layers: Layer[], viewport: Viewport) {
    // 1. 清空画布
    this.clearCanvas();

    // 2. 应用视口变换（缩放、平移）
    this.mainCtx.save();
    this.applyViewportTransform(viewport);

    // 3. 绘制背景图层
    this.renderBackgroundImage();

    // 4. 按zIndex顺序绘制所有图层
    const sortedLayers = layers
      .filter(l => l.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      this.renderLayer(layer);
    }

    // 5. 绘制临时内容（正在绘制的形状）
    this.renderTemporaryDrawing();

    this.mainCtx.restore();
  }

  // 单个图层渲染
  renderLayer(layer: Layer) {
    // 检查缓存
    if (!layer.dirty && layer.cache) {
      this.drawCachedLayer(layer);
      return;
    }

    // 重新绘制到离屏Canvas
    const offscreen = this.createOffscreenCanvas(layer);
    this.drawLayerContent(layer, offscreen.getContext('2d'));

    // 缓存
    layer.cache = offscreen;
    layer.dirty = false;

    // 绘制到主Canvas
    this.drawCachedLayer(layer);
  }

  // 绘制缓存图层
  drawCachedLayer(layer: Layer) {
    const ctx = this.mainCtx;

    ctx.save();

    // 应用变换
    ctx.translate(layer.transform.x, layer.transform.y);
    ctx.rotate(layer.transform.rotation * Math.PI / 180);
    ctx.scale(layer.transform.scaleX, layer.transform.scaleY);

    // 应用不透明度
    ctx.globalAlpha = layer.opacity;

    // 绘制
    ctx.drawImage(layer.cache, 0, 0);

    ctx.restore();
  }
}
```

#### 各类型图层的绘制实现

**图片图层**:
```typescript
ctx.drawImage(imageElement, 0, 0, width, height);
```

**形状图层**:
```typescript
// 矩形
if (fillColor) ctx.fillRect(0, 0, width, height);
if (strokeColor) ctx.strokeRect(0, 0, width, height);

// 圆形
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
if (fillColor) ctx.fill();
if (strokeColor) ctx.stroke();

// 箭头
drawArrowPath(ctx, startPoint, endPoint, arrowHeadSize);
ctx.stroke();
```

**画笔图层**:
```typescript
ctx.beginPath();
ctx.moveTo(points[0].x, points[0].y);
for (let i = 1; i < points.length; i++) {
  ctx.lineTo(points[i].x, points[i].y);
}
ctx.stroke();
```

**文字图层**:
```typescript
ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
ctx.fillStyle = color;
ctx.fillText(text, 0, 0);
```

#### 性能优化策略

1. **离屏Canvas缓存**: 静态图层只绘制一次，缓存结果
2. **脏标记**: 只重绘变化的图层
3. **requestAnimationFrame**: 控制重绘频率
4. **图层合并**: 多个不变图层可合并为一个缓存
5. **视口裁剪**: 只绘制可见区域

### 4. 交互系统

#### 坐标转换

```typescript
class CoordinateConverter {
  // 屏幕坐标 → Canvas坐标
  screenToCanvas(
    screenX: number,
    screenY: number,
    viewport: Viewport
  ): Point {
    const rect = canvas.getBoundingClientRect();
    const canvasX = (screenX - rect.left - viewport.offsetX) / viewport.scale;
    const canvasY = (screenY - rect.top - viewport.offsetY) / viewport.scale;
    return { x: canvasX, y: canvasY };
  }

  // Canvas坐标 → 图层局部坐标
  canvasToLayer(
    canvasPoint: Point,
    layer: Layer
  ): Point {
    // 应用逆变换
    // 考虑位移、旋转、缩放
  }
}
```

#### 事件处理流程

**选择模式**:
```
MouseDown
  → hitTest找到被点击的图层
  → 设置 selectedLayer
  → 判断点击位置：
     - 控制手柄 → 进入缩放/旋转模式
     - 图层内部 → 进入拖拽模式

MouseMove
  → 根据模式：
     - 拖拽：更新 layer.transform.x/y
     - 缩放：更新 layer.transform.width/height
     - 旋转：更新 layer.transform.rotation

MouseUp
  → 完成操作
  → 添加到历史记录
  → 触发重绘
```

**绘图模式**:
```
MouseDown → 记录起点，进入绘制状态
MouseMove → 更新临时绘制，触发预览重绘
MouseUp → 创建图层对象，清除临时状态
```

#### React控制手柄组件

```tsx
interface SelectionHandlesProps {
  layer: Layer;
  viewport: Viewport;
  onDragHandle: (handle: HandleType, dx: number, dy: number) => void;
  onDragRotate: (angle: number) => void;
}

export function SelectionHandles({
  layer,
  viewport,
  onDragHandle,
  onDragRotate,
}: SelectionHandlesProps) {
  // 计算变换后的bounds（屏幕坐标）
  const transformedBounds = calculateTransformedBounds(layer, viewport);

  return (
    <div className="selection-overlay">
      {/* 8个缩放控制点 */}
      <ResizeHandle position="top-left" onDrag={onDragHandle} />
      <ResizeHandle position="top-center" onDrag={onDragHandle} />
      <ResizeHandle position="top-right" onDrag={onDragHandle} />
      <ResizeHandle position="middle-left" onDrag={onDragHandle} />
      <ResizeHandle position="middle-right" onDrag={onDragHandle} />
      <ResizeHandle position="bottom-left" onDrag={onDragHandle} />
      <ResizeHandle position="bottom-center" onDrag={onDragHandle} />
      <ResizeHandle position="bottom-right" onDrag={onDragHandle} />

      {/* 旋转手柄 */}
      <RotateHandle position="top" onDrag={onDragRotate} />

      {/* 选择框 */}
      <div className="selection-box" style={transformedBounds} />
    </div>
  );
}
```

### 5. 导出功能

#### 导出为图片

```typescript
class ImageExporter {
  async exportAsImage(
    layers: Layer[],
    backgroundImage: HTMLImageElement,
    options: ExportOptions
  ): Promise<Blob> {
    // 1. 创建导出Canvas（原始尺寸）
    const canvas = document.createElement('canvas');
    canvas.width = options.width || backgroundImage.width;
    canvas.height = options.height || backgroundImage.height;
    const ctx = canvas.getContext('2d')!;

    // 2. 绘制背景图
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    // 3. 按顺序渲染所有可见图层
    const visibleLayers = layers
      .filter(l => l.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of visibleLayers) {
      this.renderLayerForExport(ctx, layer);
    }

    // 4. 转换为Blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        options.format || 'image/png',
        options.quality || 0.9
      );
    });
  }

  // 保存到文件
  async saveToFile(blob: Blob, filename: string) {
    // 使用Tauri的save API
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const path = await save({
      defaultPath: filename,
      filters: [{
        name: 'Image',
        extensions: ['png', 'jpg', 'jpeg', 'webp']
      }]
    });

    if (path) {
      const buffer = await blob.arrayBuffer();
      await writeFile(path, new Uint8Array(buffer));
    }
  }
}
```

#### 导出项目数据

```typescript
interface ProjectData {
  version: string;
  createdAt: number;
  updatedAt: number;

  // 背景图信息
  backgroundImage: {
    path: string;
    width: number;
    height: number;
  };

  // 所有图层
  layers: Layer[];

  // 元数据
  metadata: {
    name: string;
    description?: string;
  };
}

function exportProjectData(
  backgroundImage: ImageInfo,
  layers: Layer[]
): ProjectData {
  return {
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    backgroundImage: {
      path: backgroundImage.path,
      width: backgroundImage.width,
      height: backgroundImage.height,
    },
    layers: layers.map(layer => ({
      ...layer,
      // 移除运行时数据
      cache: undefined,
      dirty: false,
    })),
    metadata: {
      name: '未命名项目',
    },
  };
}
```

### 6. 历史记录系统

#### 历史记录数据结构

```typescript
interface HistoryAction {
  type: 'add' | 'update' | 'delete' | 'reorder';
  target: 'layer';
  timestamp: number;

  // 操作前后的状态
  before: any;
  after: any;
}

interface HistoryState {
  actions: HistoryAction[];
  currentIndex: number;  // 当前所在的历史位置
  maxHistory: number;     // 最大历史记录数
}
```

#### 历史管理器实现

```typescript
class HistoryManager {
  private history: HistoryAction[] = [];
  private currentIndex = -1;
  private maxHistory = 50;

  // 添加操作到历史
  push(action: HistoryAction) {
    // 1. 截断 currentIndex 之后的所有历史
    this.history = this.history.slice(0, this.currentIndex + 1);

    // 2. 添加新操作
    this.history.push(action);
    this.currentIndex++;

    // 3. 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  // 撤销
  undo(): HistoryAction | null {
    if (this.currentIndex < 0) return null;

    const action = this.history[this.currentIndex];
    this.currentIndex--;

    return action;  // 调用者负责应用 before 状态
  }

  // 重做
  redo(): HistoryAction | null {
    if (this.currentIndex >= this.history.length - 1) return null;

    this.currentIndex++;
    const action = this.history[this.currentIndex];

    return action;  // 调用者负责应用 after 状态
  }

  // 检查是否可以撤销/重做
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
}
```

#### 需要记录历史的操作

1. **添加图层**
   ```typescript
   history.push({
     type: 'add',
     target: 'layer',
     timestamp: Date.now(),
     before: null,
     after: newLayer,
   });
   ```

2. **更新图层**
   ```typescript
   history.push({
     type: 'update',
     target: 'layer',
     timestamp: Date.now(),
     before: cloneDeep(oldLayer),
     after: cloneDeep(newLayer),
   });
   ```

3. **删除图层**
   ```typescript
   history.push({
     type: 'delete',
     target: 'layer',
     timestamp: Date.now(),
     before: deletedLayer,
     after: null,
   });
   ```

4. **调整顺序**
   ```typescript
   history.push({
     type: 'reorder',
     target: 'layer',
     timestamp: Date.now(),
     before: { layers: oldLayersOrder },
     after: { layers: newLayersOrder },
   });
   ```

## 状态管理

### Zustand Store 设计

```typescript
interface EditorState {
  // 图层管理
  layers: Layer[];
  selectedLayerId: string | null;

  // 工具状态
  activeTool: Tool;
  toolSettings: ToolSettings;

  // 绘制状态
  isDrawing: boolean;
  currentDraw: DrawState | null;

  // 视口状态
  viewport: {
    scale: number;      // 缩放比例
    offsetX: number;    // 平移
    offsetY: number;
  };

  // 历史记录
  history: HistoryManager;

  // Actions
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  selectLayer: (id: string | null) => void;

  setActiveTool: (tool: Tool) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;

  startDrawing: (point: Point) => void;
  continueDrawing: (point: Point) => void;
  finishDrawing: () => void;

  undo: () => void;
  redo: () => void;
}
```

## 实施计划

### 第一阶段：核心架构搭建

1. ✅ Canvas渲染引擎基础类
2. ✅ 图层数据结构定义
3. ✅ 状态管理Store设置
4. ✅ 基本的图层渲染流程

### 第二阶段：图层系统

1. ✅ 图层管理器组件
2. ✅ 图层面板UI
3. ✅ 图层增删改查功能
4. ✅ 图层拖拽排序
5. ✅ 图层可见性/锁定控制

### 第三阶段：选择和变换

1. ✅ 选择工具实现
2. ✅ 碰撞检测系统
3. ✅ 拖拽移动功能
4. ✅ 缩放控制手柄
5. ✅ 旋转功能

### 第四阶段：绘图工具

1. ✅ 画笔工具
2. ✅ 形状工具（矩形、圆形、箭头）
3. ✅ 文字工具
4. ✅ 马赛克工具
5. ✅ 工具设置面板

### 第五阶段：导出和历史

1. ✅ 图片导出功能
2. ✅ 项目数据保存/加载
3. ✅ 历史记录系统
4. ✅ 撤销/重做功能

### 第六阶段：优化和完善

1. ✅ 性能优化（缓存、脏标记）
2. ✅ 快捷键支持
3. ✅ 错误处理
4. ✅ 用户体验优化

## 技术栈

- **框架**: React 18
- **状态管理**: Zustand
- **Canvas API**: 原生 Canvas 2D
- **UI组件**: 现有的 UI 组件库
- **文件操作**: Tauri API
- **类型检查**: TypeScript

## 成功标准

1. ✅ 所有绘图工具正常工作
2. ✅ 图层系统完整可用
3. ✅ 选择和变换功能流畅
4. ✅ 导出功能正常
5. ✅ 撤销/重做无错误
6. ✅ 性能流畅（60fps）

## 风险和挑战

1. **性能挑战**: 大量图层时的渲染性能
   - 解决：离屏缓存、脏标记、图层合并

2. **坐标转换复杂**: Canvas坐标、DOM坐标、图层局部坐标
   - 解决：封装坐标转换工具类

3. **状态同步**: Canvas和React状态的同步
   - 解决：单一数据源，Canvas作为View层

4. **复杂变换**: 旋转后的缩放和拖拽
   - 解决：使用矩阵变换，测试各种组合

## 后续扩展

1. 滤镜效果（模糊、锐化、亮度/对比度）
2. 混合模式（正片叠底、滤色等）
3. 蒙版系统
4. 选区工具（矩形选区、魔棒选区）
5. 多选和组合
6. 图层样式（阴影、描边、发光）

---

**文档版本**: 1.0
**最后更新**: 2026-01-16
