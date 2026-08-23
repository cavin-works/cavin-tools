import { describe, expect, it } from "vitest";
import { buildOutputPath } from "./outputPath";

describe("buildOutputPath", () => {
  it("常规路径:同目录、stem 加后缀、扩展名跟随导出格式", () => {
    expect(buildOutputPath("/home/u/a.png", "png", "_edited")).toBe(
      "/home/u/a_edited.png",
    );
    expect(buildOutputPath("/tmp/x.png", "webp", "_collage")).toBe(
      "/tmp/x_collage.webp",
    );
  });

  it("无扩展名时直接追加后缀与新扩展名", () => {
    expect(buildOutputPath("/home/u/README", "jpg", "_edited")).toBe(
      "/home/u/README_edited.jpg",
    );
  });

  it("裸文件名(无目录)不产生前导斜杠", () => {
    expect(buildOutputPath("photo.png", "png", "_edited")).toBe(
      "photo_edited.png",
    );
  });

  it("Windows 反斜杠路径可正确切分目录", () => {
    // 现行为:目录保留原分隔符,拼接用 /
    expect(buildOutputPath("C:\\Users\\leo\\pic.jpg", "png", "_edited")).toBe(
      "C:\\Users\\leo/pic_edited.png",
    );
  });
});
