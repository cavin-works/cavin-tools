/**
 * 颜色转换纯函数：
 * 自动识别 #RGB(A)/#RRGGBB(AA)/rgb(a)/hsl(a) → {r,g,b,a?}，
 * 并提供 hex/rgb/hsl 字符串输出、明暗变体（HSL 的 L ± 步进）与随机色。
 */

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const hex2 = (v: number) => v.toString(16).padStart(2, "0");

const fmtA = (a: number) => String(Number(a.toFixed(2)));

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number) {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) =>
    ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

/** 0~max 范围内的数字，非法返回 null */
function num(v: string, max: number): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

export function parseColor(input: string): ParsedColor | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // #RGB(A) / #RRGGBB(AA)
  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4)
      h = [...h].map((ch) => ch + ch).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return h.length === 8
      ? { r, g, b, a: parseInt(h.slice(6, 8), 16) / 255 }
      : { r, g, b };
  }

  const rgb = s.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgb) {
    const r = num(rgb[1], 255);
    const g = num(rgb[2], 255);
    const b = num(rgb[3], 255);
    if (r === null || g === null || b === null) return null;
    if (rgb[4] !== undefined) {
      const a = num(rgb[4], 1);
      if (a === null) return null;
      return { r, g, b, a };
    }
    return { r, g, b };
  }

  const hsl = s.match(
    /^hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (hsl) {
    const h = num(hsl[1], 360);
    const sat = num(hsl[2], 100);
    const l = num(hsl[3], 100);
    if (h === null || sat === null || l === null) return null;
    const rgbOut = hslToRgb(h, sat, l);
    if (hsl[4] !== undefined) {
      const a = num(hsl[4], 1);
      if (a === null) return null;
      return { ...rgbOut, a };
    }
    return rgbOut;
  }

  return null;
}

export function toHex({ r, g, b, a }: ParsedColor): string {
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a !== undefined && a < 1 ? base + hex2(Math.round(a * 255)) : base;
}

export function toRgbString({ r, g, b, a }: ParsedColor): string {
  return a !== undefined && a < 1
    ? `rgba(${r}, ${g}, ${b}, ${fmtA(a)})`
    : `rgb(${r}, ${g}, ${b})`;
}

export function toHslString(c: ParsedColor): string {
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
  return c.a !== undefined && c.a < 1
    ? `hsla(${h}, ${s}%, ${l}%, ${fmtA(c.a)})`
    : `hsl(${h}, ${s}%, ${l}%)`;
}

function shiftLightness(c: ParsedColor, amount: number): ParsedColor {
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b);
  const rgb = hslToRgb(h, s, clamp(l + amount, 0, 100));
  return c.a !== undefined ? { ...rgb, a: c.a } : rgb;
}

/** L +amount%（默认 10），保留 alpha */
export function lighten(c: ParsedColor, amount = 10): ParsedColor {
  return shiftLightness(c, amount);
}

/** L -amount%（默认 10），保留 alpha */
export function darken(c: ParsedColor, amount = 10): ParsedColor {
  return shiftLightness(c, -amount);
}

export function randomColor(): string {
  const c = {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  };
  return toHex(c);
}
