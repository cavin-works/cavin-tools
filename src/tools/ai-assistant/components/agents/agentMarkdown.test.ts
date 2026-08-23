import { describe, expect, it } from "vitest";
import { buildAgentMarkdown, deriveFilename } from "./agentMarkdown";

describe("deriveFilename", () => {
  it("中文名被 sanitize 为安全字符", () => {
    // 纯中文全部非法 → 回退 agent.md
    expect(deriveFilename("翻译助手")).toBe("agent.md");
    // 混合:非法字符替换为连字符
    expect(deriveFilename("My Agent 名")).toBe("My-Agent.md");
  });

  it("空名回退为 agent.md", () => {
    expect(deriveFilename("")).toBe("agent.md");
    expect(deriveFilename("   ")).toBe("agent.md");
  });

  it("连续非法字符合并为单个连字符", () => {
    expect(deriveFilename("a  // b")).toBe("a-b.md");
    expect(deriveFilename("a---b")).toBe("a-b.md");
  });

  it("去除首尾连字符", () => {
    expect(deriveFilename("-hello-")).toBe("hello.md");
  });
});

describe("buildAgentMarkdown", () => {
  it("name/description 含换行被单行化（frontmatter 不被破坏）", () => {
    const md = buildAgentMarkdown(
      "多行\n名称",
      "描述\r\n第二行",
      "",
      "",
      "prompt",
    );
    const lines = md.split("\n");
    // frontmatter 只允许是 --- / name / description / --- 四行
    expect(lines.slice(0, 4)).toEqual([
      "---",
      "name: 多行 名称",
      "description: 描述 第二行",
      "---",
    ]);
  });

  it("可选字段（tools/model）为空或空白时不输出对应行", () => {
    const md = buildAgentMarkdown("n", "d", "  ", "", "p");
    expect(md).not.toContain("tools:");
    expect(md).not.toContain("model:");
  });

  it("可选字段有值时输出且去除首尾空白", () => {
    const md = buildAgentMarkdown("n", "d", " bash, grep ", " gpt-4 ", "p");
    expect(md).toContain("tools: bash, grep");
    expect(md).toContain("model: gpt-4");
  });

  it("正文 systemPrompt 被去除首尾空白,整体以单个换行结尾", () => {
    const md = buildAgentMarkdown("n", "d", "", "", "  hello\nworld  ");
    expect(md).toBe("---\nname: n\ndescription: d\n---\n\nhello\nworld\n");
  });
});
