import { describe, expect, it } from 'vitest';
import { compareTasksByOrder, groupTasksByCreatedDate } from './taskGroups';
import type { TodoTask } from '../types';

const task = (id: string, overrides: Partial<TodoTask> = {}): TodoTask => ({
  id,
  title: id,
  status: 'pending',
  priority: 'medium',
  createdAt: 1700000000000,
  ...overrides,
});

describe('compareTasksByOrder 全序（H3）', () => {
  it('有 order 的按 order 升序在前，无 order 的按 createdAt 倒序附尾', () => {
    const tasks = [
      task('no-b', { createdAt: 200 }),
      task('o2', { order: 2, createdAt: 300 }),
      task('no-a', { createdAt: 100 }),
      task('o1', { order: 1, createdAt: 400 }),
    ];
    expect([...tasks].sort(compareTasksByOrder).map((t) => t.id)).toEqual(['o1', 'o2', 'no-b', 'no-a']);
  });

  it('order 混合时排序结果稳定（可交换验证无矛盾）', () => {
    const tasks = [task('x', { order: 5 }), task('y', { createdAt: 1 }), task('z', { order: 1 })];
    const sorted = [...tasks].sort(compareTasksByOrder).map((t) => t.id);
    expect(sorted).toEqual(['z', 'x', 'y']);
    expect([...tasks].reverse().sort(compareTasksByOrder).map((t) => t.id)).toEqual(sorted);
  });
});

describe('groupTasksByCreatedDate 保持传入序（H3）', () => {
  it('组内不按 createdAt 重排，仅分组', () => {
    const today = Date.now();
    const yesterday = today - 24 * 60 * 60 * 1000;
    const tasks = [
      task('a', { createdAt: today - 5000 }),
      task('b', { createdAt: yesterday }),
      task('c', { createdAt: today }),
    ];
    const groups = groupTasksByCreatedDate(tasks);
    expect(groups.map((g) => g.label)).toEqual(['今天', '昨天']);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['a', 'c']); // a 传入在前，虽然 createdAt 更晚
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['b']);
  });
});
