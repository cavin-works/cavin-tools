import type { TodoTask } from '../types';

export interface TaskGroup {
  label: string;
  tasks: TodoTask[];
}

const startOfDay = (value: number): number => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const formatGroupLabel = (timestamp: number, now: number): string => {
  const dayMs = 24 * 60 * 60 * 1000;
  const currentDay = startOfDay(now);
  const targetDay = startOfDay(timestamp);
  const diffDays = Math.round((currentDay - targetDay) / dayMs);

  if (diffDays === 0) {
    return '今天';
  }

  if (diffDays === 1) {
    return '昨天';
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 全序比较器：有 order 的按 order 升序在前，无 order 的按创建时间倒序附在尾部。
 * 避免 order 混合时比较器非传递导致排序不稳定（H3）。
 */
export const compareTasksByOrder = (left: TodoTask, right: TodoTask): number => {
  if (left.order !== undefined && right.order !== undefined) {
    return left.order - right.order;
  }
  if (left.order !== undefined) return -1;
  if (right.order !== undefined) return 1;
  return right.createdAt - left.createdAt;
};

export const groupTasksByCreatedDate = (tasks: TodoTask[]): TaskGroup[] => {
  const now = Date.now();
  const groups = new Map<string, TodoTask[]>();

  // 保持传入顺序（拖拽排序结果），仅按 createdAt 日期分组，不重排（H3）
  tasks.forEach((task) => {
    const label = formatGroupLabel(task.createdAt, now);
    const group = groups.get(label);

    if (group) {
      group.push(task);
      return;
    }

    groups.set(label, [task]);
  });

  return Array.from(groups.entries()).map(([label, groupedTasks]) => ({
    label,
    tasks: groupedTasks,
  }));
};
