import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Settings, AlertCircle, X, Filter, ExternalLink, GripVertical } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTodoStore } from './store/stickyNotesStore';
import { SettingsModal } from './components/modals/SettingsModal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TodoPriority, TodoTask } from './types';
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
    reorderTasks,
  } = useTodoStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoPriority>('medium');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const taskRefs = useRef(new Map<string, HTMLDivElement>());

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

    await useTodoStore.getState().updateTask(id, { title: newTitle.trim() });
    setEditingTaskId(null);
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

    await reorderTasks(active.id as string, over.id as string);
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
          <div className="p-4 space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredTasks.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                {groupedTasks.map((group) => (
                  <section key={group.label} className="space-y-2">
                    <div className="flex items-center gap-2 px-1 mb-3">
                      <h3 className="text-xs font-medium text-muted-foreground/70">{group.label}</h3>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>
                    {group.tasks.map((task) => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        isActive={activeTaskId === task.id}
                        isEditing={editingTaskId === task.id}
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
                        onDoubleClick={() => handleTaskDoubleClick(task.id)}
                        onEditComplete={handleEditComplete}
                        onEditCancel={handleEditCancel}
                      />
                    ))}
                  </section>
                ))}
              </SortableContext>
            </DndContext>
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

// 可排序的任务项组件
interface SortableTaskItemProps {
  task: TodoTask;
  isActive: boolean;
  isEditing: boolean;
  setTaskRef: (element: HTMLDivElement | null) => void;
  onActivate: () => void;
  onDoubleClick: () => void;
  onEditComplete: (id: string, newTitle: string) => void;
  onEditCancel: () => void;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  isActive,
  isEditing,
  setTaskRef,
  onActivate,
  onDoubleClick,
  onEditComplete,
  onEditCancel,
}) => {
  const { toggleTask, deleteTask } = useTodoStore();
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

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

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
      ref={(element) => {
        setNodeRef(element);
        setTaskRef(element);
      }}
      style={{
        ...style,
        backgroundColor: 'hsl(var(--card))',
        borderColor: isActive ? 'hsl(var(--primary))' : 'transparent',
        boxShadow: isActive 
          ? '0 0 0 2px hsl(var(--primary) / 0.3), 0 8px 24px -8px hsl(var(--foreground) / 0.15)' 
          : '0 1px 3px hsl(var(--foreground) / 0.05)',
      }}
      onMouseEnter={onActivate}
      onMouseDown={onActivate}
      className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.01] ${
        task.status === 'completed' ? 'opacity-50' : ''
      } ${isDragging ? 'shadow-lg scale-[1.02]' : ''}`}
    >
      {/* 左侧优先级指示条 */}
      <div
        className="w-1 self-stretch rounded-full transition-all duration-200"
        style={{
          backgroundColor: isActive 
            ? 'hsl(var(--primary))' 
            : PRIORITY_COLORS[task.priority],
          opacity: isActive ? 1 : 0.6,
        }}
      />

      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all duration-150 p-1 -ml-1 rounded hover:bg-muted/50"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* 完成按钮 */}
      <button
        onClick={() => toggleTask(task.id)}
        className="flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95"
      >
        {task.status === 'completed' ? (
          <CheckCircle2
            className="w-5 h-5"
            style={{ color: '#22c55e' }}
          />
        ) : (
          <Circle
            className="w-5 h-5 transition-colors duration-150"
            style={{
              borderColor: PRIORITY_COLORS[task.priority],
              borderWidth: 2,
              backgroundColor: 'transparent',
            }}
          />
        )}
      </button>

      {/* 任务内容 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            className="w-full text-sm px-2 py-1 -mx-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-muted/50 text-foreground"
            autoFocus
          />
        ) : (
          <p
            className={`text-sm leading-relaxed cursor-pointer transition-colors duration-150 ${
              task.status === 'completed'
                ? 'line-through text-muted-foreground'
                : 'text-foreground hover:text-primary'
            }`}
            style={{
              fontWeight: isActive ? 600 : 400,
            }}
            onDoubleClick={onDoubleClick}
          >
            {task.title}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {isActive && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground font-medium tracking-wide shadow-sm">
              ACTIVE
            </span>
          )}
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-all duration-150"
            style={{
              backgroundColor: PRIORITY_COLORS[task.priority] + '15',
              color: PRIORITY_COLORS[task.priority],
              border: `1px solid ${PRIORITY_COLORS[task.priority]}30`,
            }}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <button
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-100 p-2 -mr-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-150 hover:scale-110 active:scale-95"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default StickyNotes;
