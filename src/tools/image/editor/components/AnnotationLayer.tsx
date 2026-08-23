import { useEffect, useRef, useState } from 'react';
import { useImageEditorStore } from '../store/imageEditorStore';
import type { AnnotationKind } from '../types';

/** 拖拽中的对角点（显示像素，x0/y0 为按下点） */
interface Draft {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** 箭头端头两条 45° 短线端点（unit 向量旋转 ±135° 后按 len 外推，与后端绘制一致） */
function barbs(
  tip: [number, number],
  other: [number, number],
  len: number,
): [[number, number], [number, number]] {
  const dx = tip[0] - other[0];
  const dy = tip[1] - other[1];
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const c = Math.SQRT1_2;
  return [
    [tip[0] - c * (ux + uy) * len, tip[1] + c * (ux - uy) * len],
    [tip[0] + c * (uy - ux) * len, tip[1] - c * (ux + uy) * len],
  ];
}

/** 标注图形（全部以显示像素绘制，视觉与后端导出一致） */
function Shape({
  kind,
  x0,
  y0,
  x1,
  y1,
  color,
  stroke,
  flip,
}: {
  kind: AnnotationKind;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  stroke: number;
  flip: boolean;
}) {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);
  const sw = Math.max(1, stroke);

  if (kind === 'highlight') {
    return (
      <div
        className="absolute pointer-events-none"
        style={{ left, top, width, height, backgroundColor: color, opacity: 0.35 }}
      />
    );
  }
  if (kind === 'rect') {
    return (
      <div
        className="absolute pointer-events-none"
        style={{ left, top, width, height, border: `${sw}px solid ${color}` }}
      />
    );
  }
  // arrow：双向箭头 = 主干 + 两端各两条 45° 短线（短线长 = stroke * 4，与后端一致）
  type Tuple = [number, number];
  const s: Tuple = flip ? [x1, y0] : [x0, y0];
  const e: Tuple = flip ? [x0, y1] : [x1, y1];
  const lines: [Tuple, Tuple][] = [];
  for (const [tip, other] of [
    [e, s],
    [s, e],
  ] as [Tuple, Tuple][]) {
    for (const b of barbs(tip, other, sw * 4)) {
      lines.push([tip, b]);
    }
  }
  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-visible">
      <line x1={s[0]} y1={s[1]} x2={e[0]} y2={e[1]} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {lines.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      ))}
    </svg>
  );
}

/**
 * 标注层：叠加在（已旋转/翻转/滤镜/裁剪的）预览图之上。
 * 显示已有标注 + 拖拽绘制新标注（拖出对角线，松开即提交一条）。
 * 坐标换算：标注与裁剪同处"旋转后的原图坐标系"——标注模式下预览含裁剪，
 * 故 原图坐标 = 显示坐标 * f + 裁剪原点，f = (crop ? crop.width : 旋转后原图宽) / 预览显示宽。
 */
export function AnnotationLayer({
  imgRef,
  originalWidth,
}: {
  imgRef: React.RefObject<HTMLImageElement | null>;
  originalWidth: number;
}) {
  const tool = useImageEditorStore((s) => s.annotationTool);
  const color = useImageEditorStore((s) => s.annotationColor);
  const stroke = useImageEditorStore((s) => s.annotationStroke);
  const annotations = useImageEditorStore((s) => s.params.annotations);
  const crop = useImageEditorStore((s) => s.crop);
  const addAnnotation = useImageEditorStore((s) => s.addAnnotation);

  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const dragRef = useRef<Draft | null>(null);
  // 预览图显示宽（挂载后读取一次：effect 在布局提交后执行，clientWidth 已可用）
  const [displayWidth, setDisplayWidth] = useState(0);
  useEffect(() => {
    const w = imgRef.current?.clientWidth ?? 0;
    if (w) setDisplayWidth(w);
  }, [imgRef]);

  /** 显示像素 → 原图坐标换算参数（f = 原图/显示 比例，ox/oy = 裁剪原点） */
  const mapping = () => {
    if (!displayWidth) return null;
    const base = crop ?? { width: originalWidth };
    const f = base.width / displayWidth;
    return { f, ox: crop?.x ?? 0, oy: crop?.y ?? 0 };
  };

  /** 指针事件坐标 → 容器内显示像素（钳制在图片范围内） */
  const localPoint = (e: React.PointerEvent) => {
    const bounds = rootRef.current!.getBoundingClientRect();
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
    return { x: clamp(e.clientX - bounds.left, bounds.width), y: clamp(e.clientY - bounds.top, bounds.height) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!tool) return;
    e.preventDefault();
    rootRef.current?.setPointerCapture(e.pointerId);
    const p = localPoint(e);
    const d: Draft = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    dragRef.current = d;
    setDraft(d);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const p = localPoint(e);
    const d = { ...dragRef.current, x1: p.x, y1: p.y };
    dragRef.current = d;
    setDraft(d);
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDraft(null);
    const m = mapping();
    if (!d || !m || !tool) return;
    // 误触过滤：拖拽距离过短不提交
    if (Math.hypot(d.x1 - d.x0, d.y1 - d.y0) < 4) return;
    // 显示像素 → 旋转后原图坐标，提交对角点矩形包络
    const ax = d.x0 * m.f + m.ox;
    const ay = d.y0 * m.f + m.oy;
    const bx = d.x1 * m.f + m.ox;
    const by = d.y1 * m.f + m.oy;
    addAnnotation({
      kind: tool,
      x: Math.round(Math.min(ax, bx)),
      y: Math.round(Math.min(ay, by)),
      width: Math.round(Math.abs(bx - ax)),
      height: Math.round(Math.abs(by - ay)),
      color,
      stroke,
      // 拖拽方向与主对角线（左上→右下）相反时取另一条对角线
      flip: (bx - ax) * (by - ay) < 0,
    });
  };

  const m = mapping();

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 touch-none cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {m &&
        annotations.map((ann, i) => (
          <Shape
            key={i}
            kind={ann.kind}
            x0={(ann.x - m.ox) / m.f}
            y0={(ann.y - m.oy) / m.f}
            x1={(ann.x + ann.width - m.ox) / m.f}
            y1={(ann.y + ann.height - m.oy) / m.f}
            color={ann.color}
            stroke={ann.stroke / m.f}
            flip={ann.flip}
          />
        ))}
      {m && draft && (
        <Shape
          kind={tool!}
          x0={draft.x0}
          y0={draft.y0}
          x1={draft.x1}
          y1={draft.y1}
          color={color}
          stroke={stroke / m.f}
          flip={(draft.x1 - draft.x0) * (draft.y1 - draft.y0) < 0}
        />
      )}
    </div>
  );
}
