import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Settings, AlertCircle, X, Filter, ExternalLink } from 'lucide-react';
import { useTodoStore } from './store/stickyNotesStore';
import { SettingsModal } from './components/modals/SettingsModal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TodoPriority } from './types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from './types';
import { groupTasksByCreatedDate } from './utils/taskGroups';

export const StickyNotes: React.FC = () => {
  const {
    isLoading,
    error,
    initialized,
    loadTasks,
    setError,
    filter,
    setFilter,
    addTask,
    showWidget,
    getFilteredTasks,
    getPendingCount,
    getCompletedCount,
  } = useTodoStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoPriority>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const taskRefs = useRef(new Map<string, HTMLDivElement>());

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

  // 初始加载数据
  useEffect(() => {
    if (!initialized) {
      loadTasks();
    }
  }, [initialized, loadTasks]);

  useEffect(() => {
    const handleFocusInput = () => {
      focusInput();
    };

    window.addEventListener('todo:focus-main-input', handleFocusInput);
    return () => {
      window.removeEventListener('todo:focus-main-input', handleFocusInput);
    };
  }, []);

  // 添加任务
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask(newTaskTitle.trim(), newTaskPriority);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  const cycleFilter = (direction: 1 | -1) => {
    const filterOrder: Array<typeof filter> = ['pending', 'completed', 'all'];
    const currentIndex = filterOrder.indexOf(filter);
    const nextIndex = (currentIndex + direction + filterOrder.length) % filterOrder.length;
    setFilter(filterOrder[nextIndex]);
  };

  const filteredTasks = getFilteredTasks();
  const groupedTasks = groupTasksByCreatedDate(filteredTasks);
  const visibleTasks = useMemo(
    () => groupedTasks.flatMap((group) => group.tasks),
    [groupedTasks]
  );
  const pendingCount = getPendingCount();
  const completedCount = getCompletedCount();

  const moveActiveTask = (direction: -1 | 1) => {
    if (visibleTasks.length === 0) {
      return;
    }

    const currentIndex = visibleTasks.findIndex((task) => task.id === activeTaskId);
    const nextIndex = currentIndex === -1
      ? 0
      : Math.min(Math.max(currentIndex + direction, 0), visibleTasks.length - 1);

    setActiveTaskId(visibleTasks[nextIndex].id);
  };

  const handleNavigationKeyDown = (event: {
    key: string;
    shiftKey: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    target: EventTarget | null;
    preventDefault: () => void;
  }) => {
    const target = event.target as HTMLElement | null;
    const isTextInput = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target?.isContentEditable;
    if (showSettings) {
      return;
    }

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
      moveActiveTask(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    if (isTextInput) {
      if (target === inputRef.current) {
        if (newTaskTitle.trim()) {
          event.preventDefault();
          void handleAddTask();
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
    void useTodoStore.getState().toggleTask(activeTaskId);
  };

  // 打开桌面小部件
  const handleOpenWidget = async () => {
    await showWidget();
  };

  useEffect(() => {
    if (visibleTasks.length === 0) {
      setActiveTaskId(null);
      return;
    }

    if (!activeTaskId || !visibleTasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(visibleTasks[0].id);
    }
  }, [activeTaskId, visibleTasks]);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    const activeElement = taskRefs.current.get(activeTaskId);
    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [activeTaskId]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      handleNavigationKeyDown(event);
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [activeTaskId, filter, newTaskTitle, showSettings, visibleTasks]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Todo List</h1>
              <p className="text-sm text-muted-foreground">
                {pendingCount} 待办 · {completedCount} 已完成
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenWidget}
              variant="outline"
              className="gap-2 text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="w-4 h-4" />
              桌面小部件
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="设置"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 添加任务 */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleNavigationKeyDown}
            placeholder="添加新任务..."
            className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg border border-border focus:border-primary focus:outline-none text-sm placeholder:text-muted-foreground"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as TodoPriority)}
            className="px-3 py-2 bg-muted text-foreground rounded-lg border border-border focus:border-primary focus:outline-none text-sm"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === 'pending'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            待办
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === 'completed'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            已完成
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            全部
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-destructive hover:text-destructive/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <ScrollArea className="flex-1">
        {isLoading && !initialized ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Circle className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">暂无任务</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {groupedTasks.map((group) => (
              <section key={group.label} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {group.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isActive={activeTaskId === task.id}
                    setTaskRef={(element) => {
                      if (element) {
                        taskRefs.current.set(task.id, element);
                      } else {
                        taskRefs.current.delete(task.id);
                      }
                    }}
                    onActivate={() => {
                      setActiveTaskId(task.id);
                    }}
                  />
                ))}
              </section>
            ))}
          </div>
          )}
      </ScrollArea>

      {/* 底部操作 */}
      {completedCount > 0 && (
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => useTodoStore.getState().clearCompleted()}
            className="text-muted-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清除已完成 ({completedCount})
          </Button>
        </div>
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

// 任务项组件
interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: 'pending' | 'completed';
    priority: TodoPriority;
    createdAt: number;
  };
  isActive: boolean;
  setTaskRef: (element: HTMLDivElement | null) => void;
  onActivate: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isActive, setTaskRef, onActivate }) => {
  const { toggleTask, deleteTask } = useTodoStore();

  return (
    <div
      ref={setTaskRef}
      onMouseEnter={onActivate}
      onMouseDown={onActivate}
      className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 ${
        task.status === 'completed' ? 'opacity-60' : ''
      }`}
      style={{
        backgroundColor: isActive ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
        borderColor: isActive ? 'hsl(var(--primary) / 0.9)' : 'hsl(var(--border))',
        boxShadow: isActive ? '0 0 0 3px hsl(var(--primary) / 0.22), 0 14px 32px -18px hsl(var(--foreground) / 0.5)' : 'none',
      }}
    >
      <div
        className="w-1.5 self-stretch rounded-full"
        style={{
          backgroundColor: isActive ? 'hsl(var(--primary))' : 'transparent',
        }}
      />
      {/* 完成按钮 */}
      <button
        onClick={() => toggleTask(task.id)}
        className="flex-shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2
            className="w-5 h-5"
            style={{ color: isActive ? 'hsl(var(--primary))' : '#22c55e' }}
          />
        ) : (
          <Circle
            className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors"
            style={{
              color: isActive ? 'hsl(var(--primary))' : task.status === 'pending' ? PRIORITY_COLORS[task.priority] : undefined,
            }}
          />
        )}
      </button>

      {/* 任务内容 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            task.status === 'completed'
              ? 'line-through text-muted-foreground'
              : 'text-foreground'
          }`}
          style={{
            fontWeight: isActive ? 700 : 500,
          }}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {isActive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold tracking-wide">
              ACTIVE
            </span>
          )}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: PRIORITY_COLORS[task.priority] + '20',
              color: PRIORITY_COLORS[task.priority],
            }}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <button
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default StickyNotes;
