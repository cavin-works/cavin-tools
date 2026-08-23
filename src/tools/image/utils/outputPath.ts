/**
 * 图片导出输出路径（editor 与 collage 共用）：
 * 与输入同目录，{stem}{suffix}.{format}
 */
export function buildOutputPath(
  input: string,
  format: string,
  suffix: string,
): string {
  const idx = Math.max(input.lastIndexOf("/"), input.lastIndexOf("\\"));
  const dir = idx >= 0 ? input.slice(0, idx) : "";
  const name = idx >= 0 ? input.slice(idx + 1) : input;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const file = `${stem}${suffix}.${format}`;
  return dir ? `${dir}/${file}` : file;
}
