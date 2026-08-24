import { describe, expect, it } from 'vitest';
import { renderTextOverlay, renderTextOverlays } from './textOverlay';
import type { Annotation } from '../types';

// vitest 默认 node 环境无 DOM/canvas，无法验证 fillText/toDataURL 的真实渲染
// （位图断言需 jsdom + canvas 依赖，此处不引入）；仅覆盖输入校验与降级路径。
describe('renderTextOverlay', () => {
  it('空文本与纯空白返回 null（不生成 overlay）', () => {
    expect(renderTextOverlay('', '#FF0000', 28)).toBeNull();
    expect(renderTextOverlay('   ', '#FF0000', 28)).toBeNull();
  });

  it('无 canvas 环境（node 测试环境）返回 null 而非抛错', () => {
    expect(typeof document === 'undefined').toBe(true);
    expect(renderTextOverlay('你好', '#FF0000', 28)).toBeNull();
  });
});

describe('renderTextOverlays', () => {
  const textAnn: Annotation = {
    kind: 'text', x: 10, y: 20, width: 0, height: 0,
    color: '#FF0000', stroke: 0, flip: false, text: 'hi', size: 28,
  };
  const shapeAnn: Annotation = {
    kind: 'rect', x: 0, y: 0, width: 5, height: 5,
    color: '#00FF00', stroke: 2, flip: false,
  };

  it('非文字标注与空文本文字标注被忽略', () => {
    // node 环境下合法文字也渲染不出 PNG → 全部为空
    expect(renderTextOverlays([shapeAnn, textAnn, { ...textAnn, text: '' }])).toEqual([]);
  });

  it('空列表返回空数组', () => {
    expect(renderTextOverlays([])).toEqual([]);
  });
});
