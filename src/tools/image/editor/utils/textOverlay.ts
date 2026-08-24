import type { Annotation, TextOverlay } from '../types';
import { TEXT_FONT_SIZE } from '../types';

// 与 AnnotationLayer 的 DOM 渲染保持一致：系统 sans-serif 字体
const FONT = (size: number) => `${size}px sans-serif`;

/**
 * 把单条文字渲染为 PNG（离屏 canvas）：
 * measureText 定宽高 → fillText → toDataURL 去掉 data: 前缀。
 * 返回 null 表示无法生成（空文本 / 无 canvas 环境，如 node 测试环境）。
 */
export function renderTextOverlay(
  text: string,
  color: string,
  size: number,
): { pngBase64: string; width: number; height: number } | null {
  if (!text.trim() || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.font = FONT(size);
  const metrics = ctx.measureText(text);
  // ascent/descent 度量部分环境缺失时回退到字号经验倍数
  const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
  const descent = metrics.actualBoundingBoxDescent || size * 0.25;
  canvas.width = Math.max(1, Math.ceil(metrics.width));
  canvas.height = Math.max(1, Math.ceil(ascent + descent));
  // 设置 canvas 尺寸会重置 ctx 状态，需重设字体
  ctx.font = FONT(size);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, 0, ascent);

  return {
    pngBase64: canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * 把所有文字标注渲染为后端 textOverlays（非文字标注忽略，坐标原样 scale=1）。
 * 导出链专用：预览链不传 textOverlays（预览由 AnnotationLayer DOM 呈现）。
 */
export function renderTextOverlays(annotations: Annotation[]): TextOverlay[] {
  const overlays: TextOverlay[] = [];
  for (const ann of annotations) {
    if (ann.kind !== 'text' || !ann.text) continue;
    const size = ann.size ?? TEXT_FONT_SIZE[ann.stroke] ?? 28;
    const png = renderTextOverlay(ann.text, ann.color, size);
    if (png) overlays.push({ x: ann.x, y: ann.y, pngBase64: png.pngBase64 });
  }
  return overlays;
}
