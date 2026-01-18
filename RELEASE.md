# Release 发布流程

本文档描述了基于标签的自动化发布流程。

## 📋 工作流程概述

```
开发完成 → 规范提交 → 打标签 → 推送标签 → GitHub Actions 自动处理
   ↓          ↓         ↓         ↓              ↓
 功能代码  commitlint  vX.X.X  git push    构建 + 发布
                       生成 changelog    创建 Release
```

## 🔄 完整发布步骤

### 1. 日常开发

开发时遵循约定式提交规范：

```bash
# 新功能
git commit -m "feat: 添加图片裁剪功能"

# Bug 修复
git commit -m "fix: 修复内存泄漏问题"

# 文档更新
git commit -m "docs: 更新 README 使用说明"

# 样式调整
git commit -m "style: 统一按钮样式"

# 重构
git commit -m "refactor: 优化组件结构"

# 性能优化
git commit -m "perf: 优化图片加载速度"

# 测试
git commit -m "test: 添加单元测试"

# 构建工具
git commit -m "chore: 升级依赖版本"
```

### 2. 准备发布

在发布前，确保：

- ✅ 所有代码已推送到 master 分支
- ✅ 所有提交符合 commitlint 规范
- ✅ 本地构建测试通过：`pnpm run tauri:build`

### 3. 本地测试 Changelog（可选）

在打标签前，可以预览生成的 changelog：

```bash
# 测试生成 v0.2.0 的 changelog
node scripts/test-changelog.cjs 0.2.0

# 查看生成的 CHANGELOG.md
cat CHANGELOG.md
```

如果满意，提交更改：

```bash
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 到 v0.2.0"
git push
```

### 4. 打标签并推送

```bash
# 创建标签
git tag v0.2.0

# 推送标签到远程（触发 GitHub Actions）
git push origin v0.2.0
```

### 5. GitHub Actions 自动处理

标签推送后，GitHub Actions 会自动：

1. ✅ 检出代码和完整 git 历史
2. ✅ 从标签提取版本号
3. ✅ 更新版本号到配置文件：
   - package.json
   - src-tauri/Cargo.toml
   - src-tauri/tauri.conf.json
4. ✅ 生成 CHANGELOG.md（基于提交历史）
5. ✅ 翻译为中文格式（✨ 新功能、🐛 Bug 修复等）
6. ✅ 提取当前版本的 release notes
7. ✅ 提交更新到仓库
8. ✅ 创建 GitHub Release
9. ✅ 多平台构建 Tauri 应用：
   - macOS ARM64 (Apple Silicon)
   - macOS x64 (Intel)
   - macOS Universal (通用二进制)
   - Windows x64
10. ✅ 上传构建产物到 Release

## 🎯 版本号规范

遵循语义化版本（Semantic Versioning）：`MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): 破坏性变更
- **MINOR** (0.X.0): 新功能，向后兼容
- **PATCH** (0.0.X): Bug 修复，向后兼容

### 示例

```bash
# PATCH 版本（Bug 修复）
git tag v0.1.1
git push origin v0.1.1

# MINOR 版本（新功能）
git tag v0.2.0
git push origin v0.2.0

# MAJOR 版本（破坏性变更）
git tag v1.0.0
git push origin v1.0.0
```

## 📝 Release Notes 格式

生成的 Release Notes 会是纯中文格式：

```markdown
### ✨ 新功能
- 添加图片背景去除功能 ([abc1234](https://github.com/cavin-works/cavin-tools/commit/abc1234))
- 新增视频裁剪工具 ([def5678](https://github.com/cavin-works/cavin-tools/commit/def5678))

### 🐛 Bug 修复
- 修复内存泄漏问题 ([ghi9012](https://github.com/cavin-works/cavin-tools/commit/ghi9012))
- 修复 Tauri 窗口拖拽功能 ([jkl3456](https://github.com/cavin-works/cavin-tools/commit/jkl3456))

### 📝 文档
- 更新 README 使用说明 ([mno7890](https://github.com/cavin-works/cavin-tools/commit/mno7890))

### 🔧 构建/工具
- 升级 Tauri 到 2.0 ([pqr2345](https://github.com/cavin-works/cavin-tools/commit/pqr2345))
- 优化构建配置 ([stu6789](https://github.com/cavin-works/cavin-tools/commit/stu6789))

### ⚡ 性能优化
- 优化图片加载速度 ([vwx0123](https://github.com/cavin-works/cavin-tools/commit/vwx0123))
```

## 🛠️ 常用命令

### 查看现有标签

```bash
# 列出所有标签
git tag

# 查看标签详情
git show v0.2.0
```

### 删除标签（如果打错了）

```bash
# 删除本地标签
git tag -d v0.2.0

# 删除远程标签
git push origin :refs/tags/v0.2.0

# 或使用（Git 1.8.0+）
git push origin --delete v0.2.0
```

### 查看提交历史

```bash
# 查看最近的提交
git log --oneline -10

# 查看特定类型的提交
git log --oneline --grep="feat"
git log --oneline --grep="fix"
```

### 预览 Changelog

```bash
# 在打标签前预览 changelog
node scripts/test-changelog.cjs 0.2.0

# 查看完整的 CHANGELOG.md
cat CHANGELOG.md
```

## 🐛 故障排查

### 1. commitlint 检查失败

**问题**：提交时被 commitlint 阻止

**解决**：
```bash
# 查看错误详情
pnpm commitlint --from HEAD~1 --to HEAD

# 修改最后一次提交
git commit --amend -m "feat: 正确的提交格式"
```

### 2. 标签推送后没有触发 Actions

**可能原因**：
- 标签名不符合格式（必须是 `v*`，如 `v1.0.0`）
- GitHub token 权限不足

**解决**：
```bash
# 确保标签格式正确
git tag v1.0.0  # ✅ 正确
git tag 1.0.0   # ❌ 错误（缺少 v 前缀）

# 重新推送
git push origin v1.0.0
```

### 3. CHANGELOG 生成不正确

**问题**：生成的 changelog 内容不完整或格式错误

**解决**：
```bash
# 本地测试生成
node scripts/test-changelog.cjs <version>

# 检查提交消息格式
git log --oneline -10

# 如果需要，可以手动编辑 CHANGELOG.md
vim CHANGELOG.md
```

### 4. 构建失败

**问题**：GitHub Actions 构建失败

**检查**：
1. 查看 Actions 日志
2. 确保本地构建通过：`pnpm run tauri:build`
3. 检查依赖版本是否正确
4. 确认所有配置文件格式正确

## 📊 发布检查清单

发布前确认：

- [ ] 代码已推送到 master
- [ ] 所有提交符合 commitlint 规范
- [ ] 本地构建测试通过
- [ ] 版本号符合语义化版本规范
- [ ] CHANGELOG.md 内容准确（可选预览）
- [ ] 标签格式正确（v*）

发布后验证：

- [ ] GitHub Actions 运行成功
- [ ] GitHub Release 已创建
- [ ] Release Notes 格式正确（中文）
- [ ] CHANGELOG.md 已更新
- [ ] 构建产物已上传
- [ ] 版本号已同步

## 🎉 首次发布

如果是第一次发布：

```bash
# 1. 确保代码已推送
git push origin master

# 2. 创建第一个标签
git tag v0.1.0

# 3. 推送标签
git push origin v0.1.0

# 4. 观察GitHub Actions运行
# 访问：https://github.com/cavin-works/cavin-tools/actions
```

## 📚 相关文档

- [约定式提交规范](https://www.conventionalcommits.org/zh-hans/)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [commitlint 文档](https://commitlint.js.org/)
- [conventional-changelog 文档](https://github.com/conventional-changelog/conventional-changelog)
