import React, { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  CheckCircle2,
  Circle,
  Plus,
  Pin,
  PinOff,
  X,
  Minus,
  GripVertical,
  Monitor,
  MonitorOff,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TodoTask, TodoPriority, TodoConfig, TodoStatus, ThemeColors } from './types';
import { PRIORITY_COLORS, PRIORITY_LABELS, WIDGET_THEMES, DEFAULT_CONFIG } from './types';
import { groupTasksByCreatedDate } from './utils/taskGroups';

// 可排序的任务项组件
interface SortableTaskItemProps {
  task: TodoTask;
  isActive: boolean;
  isEditing: boolean;
  themeColors: ThemeColors;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onEditComplete: (id: string, newTitle: string) => void;
  onEditCancel: () => void;
  onMouseEnter: () => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  isActive,
  isEditing,
  themeColors,
  onToggle,
  onDelete,
  onDoubleClick,
  onEditComplete,
  onEditCancel,
  onMouseEnter,
}) => {
  const [editTitle, setEditTitle] = useState(task.title);
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditComplete(task.id, editTitle.trim() || task.title);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditTitle(task.title);
      onEditCancel();
    }
  };

  const handleEditBlur = () => {
    onEditComplete(task.id, editTitle.trim() || task.title);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isActive ? `${themeColors.accent}36` : 'transparent',
        outline: isActive ? `1px solid ${themeColors.accent}aa` : 'none',
        boxShadow: isActive ? `0 0 0 1px ${themeColors.accent}33, inset 3px 0 0 ${themeColors.accent}` : 'none',
        opacity: task.status === 'completed' ? 0.5 : 1,
      }}
      onMouseEnter={onMouseEnter}
      className="group flex items-center gap-2 px-2 py-2 rounded transition-colors"
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: themeColors.textSecondary }}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
        ) : (
          <Circle
            className="w-4 h-4 hover:opacity-80 transition-opacity"
            style={{ borderColor: PRIORITY_COLORS[task.priority], borderWidth: 2 }}
          />
        )}
      </button>

      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
          className="flex-1 text-sm px-1 py-0.5 rounded focus:outline-none focus:ring-1"
          style={{
            backgroundColor: `${themeColors.text}10`,
            color: themeColors.text,
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm truncate cursor-pointer ${
            task.status === 'completed' ? 'line-through' : ''
          }`}
          style={{
            color: task.status === 'completed' ? themeColors.textSecondary : themeColors.text,
          }}
          onDoubleClick={() => onDoubleClick(task.id)}
        >
          {task.title}
        </span>
      )}

      <span
        className="text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: PRIORITY_COLORS[task.priority] + '30',
          color: PRIORITY_COLORS[task.priority],
        }}
      >
        {PRIORITY_LABELS[task.priority]}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
        style={{ color: themeColors.textSecondary }}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export const TodoWidget: React.FC = () => {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [config, setConfig] = useState<TodoConfig | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoPriority>('medium');
  const [isPinned, setIsPinned] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const taskRefs = useRef(new Map<string, HTMLDivElement>());

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动 8px 才开始拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const focusInput = () => {
    const attempts = [0, 40, 120, 240];
    attempts.forEach((delay) => {
      window.setTimeout(() => {
        const input = inputRef.current;
        if (!input) {
          return;
        }

        input.focus();
        input.select();
      }, delay);
    });
  };

  const cycleFilter = (direction: 1 | -1) => {
    const filterOrder: Array<typeof filter> = ['pending', 'completed', 'all'];
    const currentIndex = filterOrder.indexOf(filter);
    const nextIndex = (currentIndex + direction + filterOrder.length) % filterOrder.length;
    setFilter(filterOrder[nextIndex]);
  };

  const moveActiveTask = (direction: -1 | 1, displayTasks: TodoTask[]) => {
    if (displayTasks.length === 0) {
      return;
    }

    const currentIndex = displayTasks.findIndex((task) => task.id === activeTaskId);
    const nextIndex = currentIndex === -1
      ? 0
      : Math.min(Math.max(currentIndex + direction, 0), displayTasks.length - 1);

    setActiveTaskId(displayTasks[nextIndex].id);
  };

  // 获取当前主题颜色
  const themeColors = useMemo((): ThemeColors => {
    if (!config?.widget) {
      return WIDGET_THEMES.dark;
    }
    if (config.widget.theme === 'custom' && config.widget.customColors) {
      return config.widget.customColors;
    }
    const themeKey = config.widget.theme === 'custom' ? 'dark' : config.widget.theme;
    return WIDGET_THEMES[themeKey] || WIDGET_THEMES.dark;
  }, [config?.widget?.theme, config?.widget?.customColors]);

  const opacity = config?.widget?.opacity ?? DEFAULT_CONFIG.widget.opacity;

  const buildWindowState = (overrides?: Partial<TodoConfig['widget']>) => {
    const widgetConfig = {
      ...(config?.widget ?? DEFAULT_CONFIG.widget),
      ...(overrides ?? {}),
    };

    return {
      x: widgetConfig.position.x,
      y: widgetConfig.position.y,
      width: widgetConfig.width,
      height: widgetConfig.height,
      isDetached: true,
      isPinned: widgetConfig.isPinned,
      isDesktopMode: widgetConfig.isDesktopMode,
      opacity: widgetConfig.opacity,
    };
  };

  // 解析颜色为 RGB 值
  const parseColor = (color: string): { r: number; g: number; b: number } => {
    // 如果是 rgba 格式
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3]),
      };
    }
    // 如果是 hex 格式
    const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16),
      };
    }
    return { r: 30, g: 30, b: 30 };
  };

  // 获取带透明度的背景色
  const getBackgroundColor = () => {
    const { r, g, b } = parseColor(themeColors.background);
    return isDesktopMode
      ? `rgba(${r}, ${g}, ${b}, ${opacity})`
      : `rgb(${r}, ${g}, ${b})`;
  };

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await invoke<{ tasks: TodoTask[]; config: TodoConfig }>('load_sticky_notes');
        if (data) {
          // 按 order 字段排序，如果没有 order 则按创建时间排序
          const sortedTasks = (data.tasks || []).sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            return b.createdAt - a.createdAt;
          });
          setTasks(sortedTasks);
          if (data.config?.widget) {
            setConfig(data.config);
            setIsPinned(data.config.widget.isPinned);
            setIsDesktopMode(data.config.widget.isDesktopMode);
          }
        }
      } catch (err) {
        console.error('加载数据失败:', err);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let unlistenFocus: (() => void) | undefined;
    let unlistenData: (() => void) | undefined;
    let unlistenMoved: (() => void) | undefined;
    let unlistenResized: (() => void) | undefined;

    const loadData = async () => {
      try {
        const data = await invoke<{ tasks: TodoTask[]; config: TodoConfig }>('load_sticky_notes');
        if (data) {
          const sortedTasks = (data.tasks || []).sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            return b.createdAt - a.createdAt;
          });
          setTasks(sortedTasks);
          if (data.config?.widget) {
            setConfig(data.config);
            setIsPinned(data.config.widget.isPinned);
            setIsDesktopMode(data.config.widget.isDesktopMode);
          }
        }
      } catch (err) {
        console.error('同步数据失败:', err);
      }
    };

    const registerListeners = async () => {
      const window = getCurrentWindow();

      unlistenFocus = await listen('todo-widget-focus-input', () => {
        setFilter('pending');
        focusInput();
      });

      unlistenData = await listen('sticky-notes-data-updated', () => {
        void loadData();
      });

      unlistenMoved = await window.onMoved(({ payload }) => {
        scheduleSaveWidgetLayout({
          position: {
            x: payload.x,
            y: payload.y,
          },
        });
      });

      unlistenResized = await window.onResized(({ payload }) => {
        scheduleSaveWidgetLayout({
          width: payload.width,
          height: payload.height,
        });
      });
    };

    void registerListeners();

    return () => {
      unlistenFocus?.();
      unlistenData?.();
      unlistenMoved?.();
      unlistenResized?.();
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  // 保存数据
  const saveData = async (updatedTasks: TodoTask[], updatedConfig?: TodoConfig) => {
    try {
      await invoke('save_sticky_notes', {
        data: {
          tasks: updatedTasks,
          config: updatedConfig || config,
          version: 1,
        },
      });
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 添加任务
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const now = Date.now();
    const newTask: TodoTask = {
      id: `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
      title: newTaskTitle.trim(),
      status: 'pending',
      priority: newTaskPriority,
      createdAt: now,
      order: 0, // 新任务在最前面
    };

    // 更新所有任务的 order
    const updatedTasks = [
      newTask,
      ...tasks.map((task, index) => ({
        ...task,
        order: index + 1,
      })),
    ];
    setTasks(updatedTasks);
    await saveData(updatedTasks);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  // 切换任务状态
  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            status: (task.status === 'pending' ? 'completed' : 'pending') as TodoStatus,
            completedAt: task.status === 'pending' ? Date.now() : undefined,
          }
        : task
    );
    setTasks(updatedTasks);
    await saveData(updatedTasks);
  };

  // 删除任务
  const deleteTask = async (id: string) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
    await saveData(updatedTasks);
  };

  // 双击进入编辑模式
  const handleTaskDoubleClick = (id: string) => {
    setEditingTaskId(id);
  };

  // 完成编辑
  const handleEditComplete = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            title: newTitle.trim(),
          }
        : task
    );
    setTasks(updatedTasks);
    setEditingTaskId(null);
    await saveData(updatedTasks);
  };

  // 取消编辑
  const handleEditCancel = () => {
    setEditingTaskId(null);
  };

  // 拖拽结束处理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 使用 arrayMove 重新排序
    const updatedTasks = arrayMove(tasks, oldIndex, newIndex).map((task, index) => ({
      ...task,
      order: index,
    }));

    setTasks(updatedTasks);
    await saveData(updatedTasks);
  };

  // 切换置顶
  const togglePin = async () => {
    const newPinned = !isPinned;
    const nextDesktopMode = newPinned ? false : isDesktopMode;
    const liveLayout = await readCurrentWidgetLayout();
    const nextConfig: TodoConfig = {
      ...(config ?? DEFAULT_CONFIG),
      widget: {
        ...(config?.widget ?? DEFAULT_CONFIG.widget),
        ...liveLayout,
        isPinned: newPinned,
        isDesktopMode: nextDesktopMode,
      },
    };

    setIsPinned(newPinned);
    setIsDesktopMode(nextDesktopMode);
    setConfig(nextConfig);
    try {
      const window = getCurrentWindow();
      if (newPinned && isDesktopMode) {
        await invoke('set_desktop_mode', {
          noteId: 'todo-widget',
          desktopMode: false,
        });
      }
      await window.setAlwaysOnTop(newPinned);
      await invoke('update_note_window_state', {
        noteId: 'todo-widget',
        state: buildWindowState({
          isPinned: newPinned,
          isDesktopMode: nextDesktopMode,
        }),
      });
      await saveData(tasks, nextConfig);
    } catch (err) {
      setIsPinned(!newPinned);
      setIsDesktopMode(isDesktopMode);
      setConfig(config);
      console.error('切换置顶失败:', err);
    }
  };

  const saveWidgetLayout = async (layout: {
    position?: { x: number; y: number };
    width?: number;
    height?: number;
  }) => {
    try {
      await invoke('save_todo_widget_layout', {
        position: layout.position,
        width: layout.width,
        height: layout.height,
      });
    } catch (err) {
      console.error('保存小组件布局失败:', err);
    }
  };

  const scheduleSaveWidgetLayout = (layout: {
    position?: { x: number; y: number };
    width?: number;
    height?: number;
  }) => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      void saveWidgetLayout(layout);
    }, 180);
  };

  const readCurrentWidgetLayout = async () => {
    try {
      const window = getCurrentWindow();
      const position = await window.outerPosition();
      const size = await window.innerSize();

      return {
        position: {
          x: position.x,
          y: position.y,
        },
        width: size.width,
        height: size.height,
      };
    } catch {
      return {
        position: config?.widget.position ?? DEFAULT_CONFIG.widget.position,
        width: config?.widget.width ?? DEFAULT_CONFIG.widget.width,
        height: config?.widget.height ?? DEFAULT_CONFIG.widget.height,
      };
    }
  };

  // 切换桌面嵌入模式
  const toggleDesktopMode = async () => {
    const newDesktopMode = !isDesktopMode;
    const nextPinned = newDesktopMode ? false : isPinned;
    const liveLayout = await readCurrentWidgetLayout();
    const nextConfig: TodoConfig = {
      ...(config ?? DEFAULT_CONFIG),
      widget: {
        ...(config?.widget ?? DEFAULT_CONFIG.widget),
        ...liveLayout,
        isDesktopMode: newDesktopMode,
        isPinned: nextPinned,
      },
    };

    setIsDesktopMode(newDesktopMode);
    setIsPinned(nextPinned);
    setConfig(nextConfig);
    try {
      if (newDesktopMode && isPinned) {
        const window = getCurrentWindow();
        await window.setAlwaysOnTop(false);
      }
      await invoke('set_desktop_mode', {
        noteId: 'todo-widget',
        desktopMode: newDesktopMode,
      });
      await invoke('update_note_window_state', {
        noteId: 'todo-widget',
        state: buildWindowState({
          isDesktopMode: newDesktopMode,
          isPinned: nextPinned,
        }),
      });
      await saveData(tasks, nextConfig);
    } catch (err) {
      setIsDesktopMode(!newDesktopMode);
      setIsPinned(isPinned);
      setConfig(config);
      console.error('切换桌面模式失败:', err);
    }
  };

  // 关闭窗口
  const closeWindow = async () => {
    try {
      const liveLayout = await readCurrentWidgetLayout();
      const nextConfig: TodoConfig = {
        ...(config ?? DEFAULT_CONFIG),
        widget: {
          ...(config?.widget ?? DEFAULT_CONFIG.widget),
          ...liveLayout,
        },
      };

      setConfig(nextConfig);
      await saveData(tasks, nextConfig);
      await saveWidgetLayout(liveLayout);

      await invoke('attach_note_window', { noteId: 'todo-widget' });
    } catch (err) {
      console.error('关闭窗口失败:', err);
    }
  };

  // 最小化
  const minimize = async () => {
    try {
      const window = getCurrentWindow();
      await window.minimize();
    } catch (err) {
      console.error('最小化失败:', err);
    }
  };

  // 拖拽窗口 - 使用 Tauri 原生拖动（支持嵌入桌面的窗口）
  const handleDragStart = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;

    try {
      // 使用 Tauri 原生拖动，这在嵌入桌面的窗口中也能工作
      await invoke('start_window_dragging', { noteId: 'todo-widget' });
    } catch (err) {
      console.error('启动拖动失败:', err);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      cycleFilter(e.shiftKey ? -1 : 1);
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (newTaskTitle.trim()) {
        return;
      }
      e.preventDefault();
      cycleFilter(e.key === 'ArrowRight' ? 1 : -1);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (newTaskTitle.trim()) {
        return;
      }
      e.preventDefault();
      moveActiveTask(e.key === 'ArrowDown' ? 1 : -1, displayTasks);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (newTaskTitle.trim()) {
        void handleAddTask();
        return;
      }

      if (activeTaskId) {
        void toggleTask(activeTaskId);
      }
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const displayTasks =
    filter === 'pending' ? pendingTasks : filter === 'completed' ? completedTasks : tasks;
  const groupedTasks = groupTasksByCreatedDate(displayTasks);

  useEffect(() => {
    if (displayTasks.length === 0) {
      setActiveTaskId(null);
      return;
    }

    if (!activeTaskId || !displayTasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(displayTasks[0].id);
    }
  }, [activeTaskId, displayTasks]);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    const activeElement = taskRefs.current.get(activeTaskId);
    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [activeTaskId]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target?.isContentEditable;

      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        cycleFilter(event.shiftKey ? -1 : 1);
        return;
      }

      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isTextInput && target === inputRef.current && newTaskTitle.trim()) {
          return;
        }

        if (isTextInput && target !== inputRef.current) {
          return;
        }

        event.preventDefault();
        cycleFilter(event.key === 'ArrowRight' ? 1 : -1);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (isTextInput && target === inputRef.current && newTaskTitle.trim()) {
          return;
        }

        if (isTextInput && target !== inputRef.current) {
          return;
        }

        event.preventDefault();
        moveActiveTask(event.key === 'ArrowDown' ? 1 : -1, displayTasks);
        return;
      }

      if (event.key !== 'Enter') {
        return;
      }

      if (isTextInput) {
        if (target === inputRef.current) {
          if (newTaskTitle.trim()) {
            return;
          }
        } else {
          return;
        }
      }

      if (!activeTaskId) {
        return;
      }

      event.preventDefault();
      void toggleTask(activeTaskId);
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [activeTaskId, displayTasks, newTaskTitle, toggleTask]);

  return (
    <div
      className="h-screen flex flex-col select-none overflow-hidden"
      style={{
        backgroundColor: getBackgroundColor(),
        backdropFilter: isDesktopMode ? 'blur(12px)' : 'none',
        color: themeColors.text,
      }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-move border-b"
        style={{ borderColor: themeColors.border }}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4" style={{ color: themeColors.textSecondary }} />
          <CheckCircle2 className="w-4 h-4" style={{ color: themeColors.accent }} />
          <span className="text-sm font-medium">Todo List</span>
          <span className="text-xs" style={{ color: themeColors.textSecondary }}>
            ({pendingTasks.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleDesktopMode}
            className={`p-1.5 rounded transition-colors ${
              isDesktopMode ? '' : ''
            }`}
            style={{
              backgroundColor: isDesktopMode ? `${themeColors.accent}30` : 'transparent',
            }}
            title={isDesktopMode ? '退出桌面嵌入' : '嵌入桌面'}
          >
            {isDesktopMode ? (
              <Monitor className="w-3.5 h-3.5" />
            ) : (
              <MonitorOff className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={togglePin}
            className={`p-1.5 rounded transition-colors`}
            style={{
              backgroundColor: isPinned ? `${themeColors.accent}30` : 'transparent',
            }}
            title={isPinned ? '取消置顶' : '置顶'}
          >
            {isPinned ? (
              <PinOff className="w-3.5 h-3.5" />
            ) : (
              <Pin className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={minimize}
            className="p-1.5 rounded transition-colors hover:opacity-80"
            title="最小化"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeWindow}
            className="p-1.5 rounded transition-colors hover:opacity-80"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 添加任务 */}
      <div className="p-3 border-b" style={{ borderColor: themeColors.border }}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加新任务..."
            className="flex-1 px-2 py-1.5 rounded text-sm focus:outline-none focus:ring-1"
            style={{
              backgroundColor: `${themeColors.text}10`,
              color: themeColors.text,
              borderColor: 'transparent',
            }}
            autoFocus
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as TodoPriority)}
            className="px-2 py-1.5 rounded text-sm focus:outline-none"
            style={{
              backgroundColor: `${themeColors.text}10`,
              color: themeColors.text,
            }}
          >
            <option value="low" style={{ backgroundColor: themeColors.background }}>低</option>
            <option value="medium" style={{ backgroundColor: themeColors.background }}>中</option>
            <option value="high" style={{ backgroundColor: themeColors.background }}>高</option>
          </select>
          <button
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim()}
            className="p-1.5 rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: themeColors.accent,
              color: '#ffffff',
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 筛选 */}
      <div className="px-3 py-2 flex gap-2 border-b" style={{ borderColor: themeColors.border }}>
        <button
          onClick={() => setFilter('pending')}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: filter === 'pending' ? themeColors.accent : 'transparent',
            color: filter === 'pending' ? '#ffffff' : themeColors.textSecondary,
          }}
        >
          待办 ({pendingTasks.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: filter === 'completed' ? themeColors.accent : 'transparent',
            color: filter === 'completed' ? '#ffffff' : themeColors.textSecondary,
          }}
        >
          已完成 ({completedTasks.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: filter === 'all' ? themeColors.accent : 'transparent',
            color: filter === 'all' ? '#ffffff' : themeColors.textSecondary,
          }}
        >
          全部 ({tasks.length})
        </button>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Circle className="w-8 h-8 mb-2" style={{ color: themeColors.textSecondary, opacity: 0.3 }} />
            <p className="text-xs" style={{ color: themeColors.textSecondary }}>暂无任务</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={displayTasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {groupedTasks.map((group) => (
                <section key={group.label} className="space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: themeColors.textSecondary }}
                    >
                      {group.label}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ backgroundColor: themeColors.border }}
                    />
                  </div>
                  {group.tasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      isActive={activeTaskId === task.id}
                      isEditing={editingTaskId === task.id}
                      themeColors={themeColors}
                      onToggle={toggleTask}
                      onDelete={deleteTask}
                      onDoubleClick={handleTaskDoubleClick}
                      onEditComplete={handleEditComplete}
                      onEditCancel={handleEditCancel}
                      onMouseEnter={() => setActiveTaskId(task.id)}
                    />
                  ))}
                </section>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default TodoWidget;
