import { useEffect, useRef, useState } from 'react';
import { useImageEditorStore } from '../store/imageEditorStore';
import type { CropRatio } from '../types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RATIOS: Record<Exclude<CropRatio, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

const MIN_SIZE = 24;

// 手柄标识：n/s/w/e 表示所在边，组合表示角
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

const HANDLES: { id: Handle; cursor: string; pos: string }[] = [
  { id: 'nw', cursor: 'nwse-resize', pos: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2' },
  { id: 'n', cursor: 'ns-resize', pos: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2' },
  { id: 'ne', cursor: 'nesw-resize', pos: 'left-full top-0 -translate-x-1/2 -translate-y-1/2' },
  { id: 'e', cursor: 'ew-resize', pos: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2' },
  { id: 'se', cursor: 'nwse-resize', pos: 'left-full top-full -translate-x-1/2 -translate-y-1/2' },
  { id: 's', cursor: 'ns-resize', pos: 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2' },
  { id: 'sw', cursor: 'nesw-resize', pos: 'left-0 top-full -translate-x-1/2 -translate-y-1/2' },
  { id: 'w', cursor: 'ew-resize', pos: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' },
];

/**
 * 裁剪框：叠加在（已旋转/翻转/滤镜的）预览图之上。
 * 内部以"显示像素"工作，提交时换算为原图坐标：
 * factor = 旋转后原图宽 / 预览显示宽。预览与原图同为旋转后的坐标系，无需旋转换算。
 */
export function CropOverlay({
  imgRef,
  originalWidth,
}: {
  imgRef: React.RefObject<HTMLImageElement | null>;
  originalWidth: number;
}) {
  const crop = useImageEditorStore((s) => s.crop);
  const cropRatio = useImageEditorStore((s) => s.cropRatio);
  const setCrop = useImageEditorStore((s) => s.setCrop);

  const rootRef = useRef<HTMLDivElement>(null);
  const [rect, setRectState] = useState<Rect | null>(null);
  const rectRef = useRef<Rect | null>(null);
  const dragRef = useRef<{ handle: Handle; orig: Rect } | null>(null);

  // 同步更新 state 与 ref（pointerup 时从 ref 读取，避免闭包中的过期 state）
  const setRect = (r: Rect) => {
    rectRef.current = r;
    setRectState(r);
  };

  const box = () => {
    const el = rootRef.current;
    return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 };
  };

  // 换算显示像素 → 原图坐标并提交
  const commit = (r: Rect) => {
    const el = imgRef.current;
    if (!el || !el.clientWidth) return;
    const factor = originalWidth / el.clientWidth;
    setCrop({
      x: Math.round(r.x * factor),
      y: Math.round(r.y * factor),
      width: Math.max(1, Math.round(r.w * factor)),
      height: Math.max(1, Math.round(r.h * factor)),
    });
  };

  // 挂载时初始化：从已保存的裁剪区域换算，或默认居中 80%
  useEffect(() => {
    const { w, h } = box();
    if (!w || !h) return;
    if (crop) {
      const el = imgRef.current;
      if (el?.clientWidth) {
        const f = originalWidth / el.clientWidth;
        const cw = Math.min(crop.width / f, w);
        const ch = Math.min(crop.height / f, h);
        setRect({
          x: Math.min(crop.x / f, w - cw),
          y: Math.min(crop.y / f, h - ch),
          w: cw,
          h: ch,
        });
        return;
      }
    }
    setRect({ x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 比例预设变化：保持中心调整宽高比并提交
  useEffect(() => {
    if (!rect || cropRatio === 'free') return;
    const { w: bw, h: bh } = box();
    const ratio = RATIOS[cropRatio];
    let { w, h } = rect;
    w = Math.min(w, bh * ratio);
    h = w / ratio;
    const next: Rect = {
      x: Math.min(Math.max(rect.x + (rect.w - w) / 2, 0), bw - w),
      y: Math.min(Math.max(rect.y + (rect.h - h) / 2, 0), bh - h),
      w,
      h,
    };
    setRect(next);
    commit(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropRatio]);

  const startDrag = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rect) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { handle, orig: rect };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const root = rootRef.current;
    if (!root) return;
    const bounds = root.getBoundingClientRect();
    const px = e.clientX - bounds.left;
    const py = e.clientY - bounds.top;
    const { w: bw, h: bh } = box();
    const { x, y, w, h } = drag.orig;
    const handle = drag.handle;
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    if (handle === 'move') {
      setRect({ x: clamp(px - w / 2, 0, bw - w), y: clamp(py - h / 2, 0, bh - h), w, h });
      return;
    }

    const movesN = handle.includes('n');
    const movesS = handle.includes('s');
    const movesW = handle.includes('w');
    const movesE = handle.includes('e');
    const ratio = cropRatio === 'free' ? null : RATIOS[cropRatio];

    let next: Rect;
    if (ratio) {
      // 锁定比例：锚定对侧角/边，按驱动轴推导另一轴
      const anchorX = movesW ? x + w : x;
      const anchorY = movesN ? y + h : y;
      const horizontal = movesE || movesW;
      let nw = w;
      let nh = h;
      if (horizontal) {
        nw = clamp(Math.abs(px - anchorX), MIN_SIZE, movesW ? anchorX : bw - anchorX);
        nh = nw / ratio;
        if (nh > bh || (movesN && nh > anchorY) || (movesS && nh > bh - anchorY)) {
          nh = Math.min(bh, movesN ? anchorY : bh - anchorY);
          nw = nh * ratio;
        }
      } else {
        nh = clamp(Math.abs(py - anchorY), MIN_SIZE, movesN ? anchorY : bh - anchorY);
        nw = nh * ratio;
        if (nw > bw) {
          nw = bw;
          nh = nw / ratio;
        }
      }
      next = {
        x: movesW ? anchorX - nw : anchorX,
        y: movesN ? anchorY - nh : anchorY,
        w: nw,
        h: nh,
      };
    } else {
      // 自由调整：各边独立
      let nx = x;
      let ny = y;
      let nw = w;
      let nh = h;
      if (movesN) {
        const edge = clamp(py, 0, y + h - MIN_SIZE);
        nh = y + h - edge;
        ny = edge;
      }
      if (movesS) {
        nh = clamp(py - y, MIN_SIZE, bh - y);
      }
      if (movesW) {
        const edge = clamp(px, 0, x + w - MIN_SIZE);
        nw = x + w - edge;
        nx = edge;
      }
      if (movesE) {
        nw = clamp(px - x, MIN_SIZE, bw - x);
      }
      next = { x: nx, y: ny, w: nw, h: nh };
    }
    setRect(next);
  };

  const onPointerUp = () => {
    if (dragRef.current && rectRef.current) commit(rectRef.current);
    dragRef.current = null;
  };

  if (!rect) return null;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* 裁剪区域：box-shadow 铺开遮罩，裁剪框外变暗 */}
      <div
        className="absolute cursor-move border border-primary"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        }}
        onPointerDown={startDrag('move')}
      >
        {/* 三分线 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
        {/* 尺寸标注 */}
        <div className="absolute -top-6 left-0 text-[10px] text-white bg-black/60 px-1 rounded pointer-events-none">
          {Math.round(rect.w)} × {Math.round(rect.h)}
        </div>
        {/* 手柄 */}
        {HANDLES.map((h) => (
          <div
            key={h.id}
            className={`absolute w-2.5 h-2.5 bg-background border border-primary rounded-sm ${h.pos}`}
            style={{ cursor: h.cursor }}
            onPointerDown={startDrag(h.id)}
          />
        ))}
      </div>
    </div>
  );
}