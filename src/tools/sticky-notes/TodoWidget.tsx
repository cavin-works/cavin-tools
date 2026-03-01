import React, { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
import type { TodoTask, TodoPriority, TodoConfig, TodoStatus, ThemeColors } from './types';
import { PRIORITY_COLORS, PRIORITY_LABELS, WIDGET_THEMES, DEFAULT_CONFIG } from './types';

export const TodoWidget: React.FC = () => {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [config, setConfig] = useState<TodoConfig | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoPriority>('medium');
  const [isPinned, setIsPinned] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

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
          setTasks(data.tasks || []);
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
    };

    const updatedTasks = [newTask, ...tasks];
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

  // 切换置顶
  const togglePin = async () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    try {
      const window = getCurrentWindow();
      await window.setAlwaysOnTop(newPinned);
      await invoke('update_note_window_state', {
        noteId: 'todo-widget',
        state: { isPinned: newPinned },
      });
    } catch (err) {
      console.error('切换置顶失败:', err);
    }
  };

  // 切换桌面嵌入模式
  const toggleDesktopMode = async () => {
    const newDesktopMode = !isDesktopMode;
    setIsDesktopMode(newDesktopMode);
    try {
      await invoke('set_desktop_mode', {
        noteId: 'todo-widget',
        desktopMode: newDesktopMode,
      });
    } catch (err) {
      console.error('切换桌面模式失败:', err);
    }
  };

  // 关闭窗口
  const closeWindow = async () => {
    try {
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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const displayTasks = filter === 'pending' ? pendingTasks : tasks;

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
          displayTasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2 px-2 py-2 rounded transition-colors"
              style={{
                opacity: task.status === 'completed' ? 0.5 : 1,
              }}
            >
              <button
                onClick={() => toggleTask(task.id)}
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

              <span
                className={`flex-1 text-sm truncate ${
                  task.status === 'completed' ? 'line-through' : ''
                }`}
                style={{
                  color: task.status === 'completed' ? themeColors.textSecondary : themeColors.text,
                }}
              >
                {task.title}
              </span>

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
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                style={{ color: themeColors.textSecondary }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoWidget;
