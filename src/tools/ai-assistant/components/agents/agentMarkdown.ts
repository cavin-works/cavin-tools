/** Agent 表单相关的纯函数（供 AgentFormModal 与测试使用） */

/** 由名称派生安全文件名（后端仅接受字母数字-_） */
export function deriveFilename(name: string): string {
  const stem = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${stem || "agent"}.md`;
}

/** 新建模式：由表单字段拼装完整 Markdown 模板 */
export function buildAgentMarkdown(
  name: string,
  description: string,
  tools: string,
  model: string,
  systemPrompt: string,
): string {
  // 单行化：换行会破坏 YAML frontmatter，导致保存后解析失败
  const singleLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
  const lines = [
    "---",
    `name: ${singleLine(name)}`,
    `description: ${singleLine(description)}`,
  ];
  if (tools.trim()) lines.push(`tools: ${tools.trim()}`);
  if (model.trim()) lines.push(`model: ${model.trim()}`);
  lines.push("---", "", systemPrompt.trim());
  return lines.join("\n") + "\n";
}
