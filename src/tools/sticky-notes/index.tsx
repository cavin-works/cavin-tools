import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Settings, AlertCircle, X, ExternalLink, GripVertical } from 'lucide-react';
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

  // 初始加载数据
  useEffect(() => {
    if (!initialized) {
      loadTasks();
    }
  }, [initialized, loadTasks]);

  // 添加任务
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask(newTaskTitle.trim(), newTaskPriority);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  const filteredTasks = getFilteredTasks();
  const groupedTasks = groupTasksByCreatedDate(filteredTasks);
  const visibleTasks = useMemo(
    () => groupedTasks.flatMap((group) => group.tasks),
    [groupedTasks]
  );
  const pendingCount = getPendingCount();
  const completedCount = getCompletedCount();

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
    if (!over || active.id === over.id) return;
    await reorderTasks(active.id as string, over.id as string);
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      e.preventDefault();
      void handleAddTask();
    }
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
    if (!activeTaskId) return;
    const activeElement = taskRefs.current.get(activeTaskId);
    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [activeTaskId]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 - 简洁版 */}
      <header className="px-6 py-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Todo</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingCount} 待办
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              onClick={showWidget}
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              小部件
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 添加任务 - 现代输入框 */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="添加新任务，按 Enter 保存..."
              className="w-full h-10 px-4 pr-20 bg-muted/50 text-foreground rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground/60"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TodoPriority)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 bg-background/80 text-xs rounded-lg border-0 focus:outline-none cursor-pointer"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <Button
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim()}
            className="h-10 w-10 rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 筛选栏 - 极简标签 */}
      <div className="px-6 py-3 flex items-center gap-1.5 border-b border-border/30">
        {(['pending', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              filter === f
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {f === 'pending' ? '待办' : f === 'completed' ? '已完成' : '全部'}
          </button>
        ))}
        {completedCount > 0 && (
          <button
            onClick={() => useTodoStore.getState().clearCompleted()}
            className="ml-auto px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            清除已完成
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="text-sm text-destructive flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 任务列表 */}
      <ScrollArea className="flex-1">
        {isLoading && !initialized ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Circle className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">暂无任务</p>
          </div>
        ) : (
          <div className="p-6 pt-4 space-y-2">
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
                  <section key={group.label} className="mb-4">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <div className="space-y-1.5">
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
                          onActivate={() => setActiveTaskId(task.id)}
                          onDoubleClick={() => handleTaskDoubleClick(task.id)}
                          onEditComplete={handleEditComplete}
                          onEditCancel={handleEditCancel}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </ScrollArea>

      {/* 设置弹窗 */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
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

  return (
    <div
      ref={(element) => {
        setNodeRef(element);
        setTaskRef(element);
      }}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
      }}
      onMouseEnter={onActivate}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out ${
        isActive 
          ? 'bg-muted/60' 
          : 'hover:bg-muted/30'
      } ${task.status === 'completed' ? 'opacity-45' : ''} ${
        isDragging ? 'shadow-lg scale-[1.02] bg-muted/80' : ''
      }`}
    >
      {/* 左侧优先级指示条 - 更简洁 */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full transition-all duration-200"
        style={{
          backgroundColor: isActive ? PRIORITY_COLORS[task.priority] : 'transparent',
          opacity: isActive ? 1 : 0,
        }}
      />

      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity p-0.5 -ml-1"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {/* 完成按钮 */}
      <button
        onClick={() => toggleTask(task.id)}
        className="flex-shrink-0 transition-transform duration-150 hover:scale-110 active:scale-90"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle
            className="w-5 h-5 transition-all duration-150"
            style={{
              borderColor: PRIORITY_COLORS[task.priority],
              borderWidth: 2,
            }}
          />
        )}
      </button>

      {/* 任务内容 */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={() => onEditComplete(task.id, editTitle.trim() || task.title)}
            className="flex-1 text-sm px-2 py-1 -mx-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground"
            autoFocus
          />
        ) : (
          <p
            className={`flex-1 text-sm leading-relaxed cursor-pointer transition-colors duration-150 ${
              task.status === 'completed'
                ? 'line-through text-muted-foreground'
                : 'text-foreground'
            }`}
            onDoubleClick={onDoubleClick}
          >
            {task.title}
          </p>
        )}

        {/* 优先级标签 - 极简点 */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          title={PRIORITY_LABELS[task.priority]}
        />
      </div>

      {/* 删除按钮 */}
      <button
        onClick={() => deleteTask(task.id)}
        className="opacity-0 group-hover:opacity-60 p-1.5 -mr-1 rounded-lg hover:bg-destructive/10 hover:!opacity-100 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default StickyNotes;
