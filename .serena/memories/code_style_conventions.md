# 代码风格和约定

## TypeScript 配置

- **严格模式**: 开启
- **未使用检查**: 开启（noUnusedLocals, noUnusedParameters）
- **switch 完整性检查**: 开启（noFallthroughCasesInSwitch）

## 代码组织

### 文件命名
- 组件文件: `PascalCase.tsx` (如 `ControlPanel.tsx`)
- 工具函数: `camelCase.ts` (如 `fileValidation.ts`)
- 类型定义: `index.ts` 或 `types.ts`
- 配置文件: `*.config.ts` (如 `tool.config.ts`)

### 目录结构
```
src/
├── tools/              # 各个工具模块
│   ├── {category}/     # 工具分类（video/image/dev/text等）
│   │   └── {tool}/     # 具体工具
│   │       ├── components/
│   │       ├── store/
│   │       ├── types/
│   │       ├── utils/
│   │       ├── tool.config.ts
│   │       └── index.tsx
├── core/               # 核心功能
│   ├── settings/
│   ├── store/          # 全局状态
│   ├── layout/
│   ├── theme/
│   └── tool-registry/
├── shared/             # 共享资源
│   ├── components/     # UI组件库（shadcn/ui）
│   ├── styles/
│   ├── hooks/
│   └── utils/
└── test/               # 测试配置
```

## 状态管理

### Zustand Store 模式
```typescript
interface ToolStore {
  // 状态字段
  currentData: DataType | null;
  setCurrentData: (data: DataType | null) => void;
  
  // 计算或派生状态
  isProcessing: boolean;
  setProcessing: (isProcessing: boolean) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  // 初始状态
  currentData: null,
  setCurrentData: (data) => set({ currentData: data }),
  isProcessing: false,
  setProcessing: (isProcessing) => set({ isProcessing }),
}));
```

## 组件规范

### 函数组件
- 优先使用函数组件 + Hooks
- Props 类型定义在组件上方

### 样式
- 使用 Tailwind CSS 工具类
- 主题颜色通过 CSS 变量使用（如 `text-primary`, `bg-background`）

## 类型定义

- 所有变量、函数参数必须显式类型标注
- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型、交叉类型
- 禁止使用 `any`

## 注释规范

- 支持中文注释
- JSDoc 风格的注释用于公开 API
- 复杂逻辑添加说明性注释

## 工具注册

每个工具需要实现 `ToolMetadata` 接口：

```typescript
export const toolConfig: ToolMetadata = {
  id: 'unique-tool-id',
  name: '工具名称',
  description: '工具描述',
  category: 'category-id',  // video/image/dev/text等
  icon: 'IconName',         // lucide-react 图标名
  component: ToolComponent,
  useToolStore: useToolStore,
  shortcut: 'CmdOrCtrl+Shift+X',
  tags: ['tag1', 'tag2'],
  status: 'stable',
  supportFileDrop: true,
  supportedFileTypes: ['ext1', 'ext2'],
};
```

## 路径别名

- `@/*` 映射到 `src/*`
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/core` → `src/core`
- `@/tools` → `src/tools`

## 禁止事项

- **禁止使用 `any` 类型**
- **禁止使用 `@ts-ignore`**
- **禁止在组件中直接修改 props**
- **禁止在渲染中创建新的函数/数组/对象**（使用 useMemo/useCallback）

## 测试规范

- 使用 Vitest + Testing Library
- 测试文件使用 `.test.tsx` 或 `.spec.tsx` 后缀
- 测试放在 `__tests__` 目录或文件同级

## UI/UX 规范

### 主题系统
- 支持 5 种主题：blue（默认）、green、orange、purple、gray
- 支持亮色/暗色模式切换
- 主题通过 `data-theme` 属性控制

### 动画
- 内置动画类：`animate-fade-in`, `animate-slide-in`, `animate-scale-in`
- 过渡类：`transition-smooth`, `transition-bounce`

### 响应式
- 默认断点：`sm`, `md`, `lg`, `xl`, `2xl`
- 使用 Tailwind 响应式前缀
