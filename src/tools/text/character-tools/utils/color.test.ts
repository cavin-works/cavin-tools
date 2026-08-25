import { describe, expect, it } from "vitest";
import {
  darken,
  lighten,
  parseColor,
  randomColor,
  toHex,
  toHslString,
  toRgbString,
  type ParsedColor,
} from "./color";

/** 每个通道容差 ≤1（hsl 往返取整误差） */
function expectClose(a: ParsedColor, b: ParsedColor) {
  expect(Math.abs(a.r - b.r)).toBeLessThanOrEqual(1);
  expect(Math.abs(a.g - b.g)).toBeLessThanOrEqual(1);
  expect(Math.abs(a.b - b.b)).toBeLessThanOrEqual(1);
  if (b.a !== undefined) expect(a.a).toBeCloseTo(b.a, 2);
  else expect(a.a).toBeUndefined();
}

describe("parseColor 自动识别", () => {
  it("hex 6/8 位与 3/4 位缩写", () => {
    expect(parseColor("#FF8000")).toEqual({ r: 255, g: 128, b: 0 });
    expect(parseColor("#ff000080")).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 128 / 255,
    });
    expect(parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseColor("  #0b7285  ")).toEqual({ r: 11, g: 114, b: 133 });
  });

  it("rgb/rgba 函数格式", () => {
    expect(parseColor("rgb(1, 2, 3)")).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseColor("RGBA(10, 20, 30, 0.5)")).toEqual({
      r: 10,
      g: 20,
      b: 30,
      a: 0.5,
    });
  });

  it("hsl/hsla 函数格式", () => {
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0 });
    const c = parseColor("hsla(120, 50%, 50%, 0.25)");
    expect(c?.a).toBe(0.25);
  });

  it("非法输入返回 null", () => {
    for (const bad of [
      "",
      "hello",
      "#12",
      "#12345",
      "#1234567",
      "#gggggg",
      "rgb(300, 0, 0)",
      "rgb(-1, 0, 0)",
      "rgb(1, 2)",
      "rgba(1, 2, 3, 2)",
      "hsl(400, 10%, 10%)",
      "hsl(10, 120%, 10%)",
      "hsl(10, 10%, 120%)",
      "red",
    ]) {
      expect(parseColor(bad)).toBeNull();
    }
  });
});

describe("格式化输出", () => {
  it("toHex/toRgbString/toHslString", () => {
    const c = { r: 255, g: 0, b: 0 };
    expect(toHex(c)).toBe("#ff0000");
    expect(toRgbString(c)).toBe("rgb(255, 0, 0)");
    expect(toHslString(c)).toBe("hsl(0, 100%, 50%)");
  });

  it("边界 0/255：纯黑与纯白", () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(toHslString({ r: 0, g: 0, b: 0 })).toBe("hsl(0, 0%, 0%)");
    expect(toHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
    expect(toHslString({ r: 255, g: 255, b: 255 })).toBe("hsl(0, 0%, 100%)");
  });

  it("alpha 透传到三种输出", () => {
    const c = parseColor("#ff000080")!;
    expect(toHex(c)).toBe("#ff000080");
    expect(toRgbString(c)).toMatch(/^rgba\(255, 0, 0, 0\.5/);
    expect(toHslString(c)).toMatch(/^hsla\(0, 100%, 50%, 0\.5/);
    // 字符串往返后 alpha 保持
    expect(parseColor(toRgbString(c))?.a).toBeCloseTo(c.a, 2);
  });
});

describe("hex → rgb → hsl → hex 往返（容差 1）", () => {
  it.each([
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#000000",
    "#ffffff",
    "#0b7285",
    "#c92a2a",
    "#f59f00",
    "#7950f2",
    "#495057",
  ])("%s 往返一致", (hex) => {
    const c1 = parseColor(hex)!;
    expect(c1).not.toBeNull();

    // hex → rgb 字符串 → 回
    const c2 = parseColor(toRgbString(c1))!;
    expectClose(c2, c1);

    // → hsl 字符串 → 回
    const c3 = parseColor(toHslString(c2))!;
    expectClose(c3, c1);

    // 最终 hex 通道一致（容差 1 → 十六进制可能差 1）
    const back = parseColor(toHex(c3))!;
    expectClose(back, c1);
  });
});

describe("lighten/darken", () => {
  it("默认 10% 步进改变亮度且保持色相", () => {
    const base = parseColor("#ff0000")!;
    const light = lighten(base);
    expect(toHslString(light)).toBe("hsl(0, 100%, 60%)");
    const dark = darken(base);
    expect(toHslString(dark)).toBe("hsl(0, 100%, 40%)");
  });

  it("自定义步进", () => {
    const base = parseColor("#ff0000")!;
    expect(toHslString(lighten(base, 30))).toBe("hsl(0, 100%, 80%)");
  });

  it("L 在 0/100 处截断，不越界", () => {
    const black = { r: 0, g: 0, b: 0 };
    expect(toHslString(darken(black))).toBe("hsl(0, 0%, 0%)");
    const white = { r: 255, g: 255, b: 255 };
    expect(toHslString(lighten(white, 50))).toBe("hsl(0, 0%, 100%)");
  });

  it("明暗变体保留 alpha", () => {
    const c = parseColor("rgba(255, 0, 0, 0.5)")!;
    expect(lighten(c).a).toBe(0.5);
    expect(darken(c).a).toBe(0.5);
  });
});

describe("randomColor", () => {
  it("返回合法 6 位 hex", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomColor()).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
