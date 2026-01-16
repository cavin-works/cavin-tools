/**
 * 编辑器状态管理
 * 使用 Zustand 管理编辑器的所有状态
 */

import { create } from 'zustand';
import type { EditorStore, ToolType, Point } from '../types';

/**
 * 默认工具设置
 */
const DEFAULT_TOOL_SETTINGS = {
  color: '#EF4444', // 红色
  strokeWidth: 3,
  opacity: 1,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal' as const,
  fillColor: null,
  strokeDashArray: [],
  mosaicSize: 10,
  blurAmount: 5,
};

/**
 * 编辑器 Store
 */
export const useEditorStore = create<EditorStore>((set, get) => ({
  // ========== 工具状态 ==========
  activeTool: 'select',
  toolSettings: DEFAULT_TOOL_SETTINGS,

  setActiveTool: (tool) => {
    console.log('🔧 切换工具:', tool);
    set({ activeTool: tool });
  },

  updateToolSettings: (settings) => {
    set((state) => ({
      toolSettings: { ...state.toolSettings, ...settings },
    }));
  },

  // ========== 图层管理 ==========
  layers: [],
  activeLayerId: null,

  addLayer: (layer) => {
    set((state) => ({
      layers: [...state.layers, layer],
    }));
  },

  updateLayer: (id, data) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, ...data, updatedAt: Date.now() } : layer
      ),
    }));
  },

  deleteLayer: (id) => {
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    }));
  },

  reorderLayers: (fromIndex, toIndex) => {
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { layers: newLayers };
    });
  },

  setActiveLayer: (id) => {
    set({ activeLayerId: id });
  },

  // ========== 标注元素 ==========
  annotations: [],
  selectedAnnotationId: null,

  addAnnotation: (annotation) => {
    const state = get();
    console.log('➕ 添加标注:', annotation.type, annotation);

    set((state) => ({
      annotations: [...state.annotations, annotation],
    }));

    // 自动添加到历史记录
    state.addToHistory({
      id: `action-${Date.now()}`,
      type: 'add',
      target: 'annotation',
      data: {
        before: null,
        after: annotation,
      },
      timestamp: Date.now(),
    });
  },

  updateAnnotation: (id, data) => {
    const state = get();
    const oldAnnotation = state.annotations.find((a) => a.id === id);

    set((state) => ({
      annotations: state.annotations.map((annotation) =>
        annotation.id === id
          ? { ...annotation, ...data, updatedAt: Date.now() }
          : annotation
      ),
    }));

    // 添加到历史记录
    if (oldAnnotation) {
      state.addToHistory({
        id: `action-${Date.now()}`,
        type: 'update',
        target: 'annotation',
        data: {
          before: oldAnnotation,
          after: { ...oldAnnotation, ...data },
        },
        timestamp: Date.now(),
      });
    }
  },

  deleteAnnotation: (id) => {
    const state = get();
    const annotation = state.annotations.find((a) => a.id === id);

    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    }));

    // 添加到历史记录
    if (annotation) {
      state.addToHistory({
        id: `action-${Date.now()}`,
        type: 'delete',
        target: 'annotation',
        data: {
          before: annotation,
          after: null,
        },
        timestamp: Date.now(),
      });
    }
  },

  selectAnnotation: (id) => {
    console.log('🎯 选中标注:', id);
    set({ selectedAnnotationId: id });
  },

  // ========== 历史记录 ==========
  history: [],
  historyIndex: -1,

  undo: () => {
    const state = get();
    if (state.historyIndex < 0) return;

    const action = state.history[state.historyIndex];
    console.log('↶ 撤销:', action);

    // 根据动作类型执行撤销
    if (action.target === 'annotation') {
      if (action.type === 'add') {
        // 撤销添加 = 删除（不记录历史）
        set((state) => ({
          annotations: state.annotations.filter((a) => a.id !== action.data.after.id),
          historyIndex: state.historyIndex - 1,
        }));
      } else if (action.type === 'delete') {
        // 撤销删除 = 恢复（不记录历史）
        set((state) => ({
          annotations: [...state.annotations, action.data.before],
          historyIndex: state.historyIndex - 1,
        }));
      } else if (action.type === 'update') {
        // 撤销更新 = 恢复旧状态（不记录历史）
        set((state) => ({
          annotations: state.annotations.map((a) =>
            a.id === action.data.before.id ? action.data.before : a
          ),
          historyIndex: state.historyIndex - 1,
        }));
      }
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const action = state.history[state.historyIndex + 1];
    console.log('↷ 重做:', action);

    // 根据动作类型执行重做
    if (action.target === 'annotation') {
      if (action.type === 'add') {
        // 重做添加
        set((state) => ({
          annotations: [...state.annotations, action.data.after],
          historyIndex: state.historyIndex + 1,
        }));
      } else if (action.type === 'delete') {
        // 重做删除
        set((state) => ({
          annotations: state.annotations.filter((a) => a.id !== action.data.before.id),
          historyIndex: state.historyIndex + 1,
        }));
      } else if (action.type === 'update') {
        // 重做更新
        set((state) => ({
          annotations: state.annotations.map((a) =>
            a.id === action.data.after.id ? action.data.after : a
          ),
          historyIndex: state.historyIndex + 1,
        }));
      }
    }
  },

  addToHistory: (action) => {
    set((state) => {
      // 如果当前不在历史记录末尾，截断后面的历史
      const newHistory =
        state.historyIndex < state.history.length - 1
          ? state.history.slice(0, state.historyIndex + 1)
          : state.history;

      // 添加新动作，限制历史记录数量为50
      const updatedHistory = [...newHistory, action].slice(-50);

      return {
        history: updatedHistory,
        historyIndex: updatedHistory.length - 1,
      };
    });
  },

  // ========== 临时绘制状态 ==========
  isDrawing: false,
  currentDraw: null,

  startDrawing: (type, point) => {
    console.log('🖊️ 开始绘制:', type, point);
    set({
      isDrawing: true,
      currentDraw: {
        type,
        points: [point],
        startPoint: point,
      },
    });
  },

  continueDrawing: (point) => {
    set((state) => {
      if (!state.currentDraw) return state;

      return {
        currentDraw: {
          ...state.currentDraw,
          points: [...state.currentDraw.points, point],
          endPoint: point,
        },
      };
    });
  },

  finishDrawing: () => {
    console.log('✅ 完成绘制');
    set({
      isDrawing: false,
      currentDraw: null,
    });
  },

  cancelDrawing: () => {
    console.log('❌ 取消绘制');
    set({
      isDrawing: false,
      currentDraw: null,
    });
  },

  // ========== 变换状态 ==========
  transforms: {
    crop: null,
    rotate: 0,
    flip: { horizontal: false, vertical: false },
    resize: null,
  },

  applyTransform: (type, data) => {
    console.log('🔄 应用变换:', type, data);
    set((state) => ({
      transforms: {
        ...state.transforms,
        [type]: data,
      },
    }));
  },

  // ========== UI状态 ==========
  showGrid: false,
  showRulers: false,
  snapToGrid: false,
  gridSize: 20,

  // ========== 导出状态 ==========
  isExporting: false,
  exportProgress: 0,

  setExporting: (isExporting) => {
    set({ isExporting });
  },

  setExportProgress: (progress) => {
    set({ exportProgress: progress });
  },

  // ========== 重置 ==========
  reset: () => {
    console.log('🔄 重置编辑器');
    set({
      activeTool: 'select',
      toolSettings: DEFAULT_TOOL_SETTINGS,
      layers: [],
      activeLayerId: null,
      annotations: [],
      selectedAnnotationId: null,
      history: [],
      historyIndex: -1,
      isDrawing: false,
      currentDraw: null,
      transforms: {
        crop: null,
        rotate: 0,
        flip: { horizontal: false, vertical: false },
        resize: null,
      },
      isExporting: false,
      exportProgress: 0,
    });
  },
}));

/**
 * 计算属性：是否可以撤销
 */
export const useCanUndo = () => {
  const historyIndex = useEditorStore((state) => state.historyIndex);
  return historyIndex >= 0;
};

/**
 * 计算属性：是否可以重做
 * 注意：分开订阅 history 和 historyIndex，避免创建新对象导致无限循环
 */
export const useCanRedo = () => {
  const historyLength = useEditorStore((state) => state.history.length);
  const historyIndex = useEditorStore((state) => state.historyIndex);
  return historyIndex < historyLength - 1;
};
