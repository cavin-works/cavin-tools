# 🚀 快速开始

基于标签的自动化发布流程已经配置完成！以下是快速使用指南。

## 📋 工作流程

```
开发 → 规范提交 → 打标签 → 推送 → 自动构建和发布
```

## ⚡ 快速发布

### 方法 1：使用命令（推荐）

**Linux/macOS:**
```bash
./scripts/release.sh 0.2.0
```

**Windows:**
```cmd
scripts\release.bat 0.2.0
```

### 方法 2：手动步骤

```bash
# 1. 测试生成的 changelog（可选）
pnpm changelog:test 0.2.0

# 2. 提交更改
git add .
git commit -m "feat: 新功能"

# 3. 推送代码
git push origin master

# 4. 打标签
git tag v0.2.0

# 5. 推送标签（触发 GitHub Actions）
git push origin v0.2.0
```

## 📝 提交规范

所有提交必须遵循以下格式：

```bash
<type>: <subject>
```

**类型（type）:**
- `feat` - 新功能 ✨
- `fix` - Bug 修复 🐛
- `docs` - 文档 📝
- `style` - 样式 💄
- `refactor` - 重构 ♻️
- `perf` - 性能优化 ⚡
- `test` - 测试 ✅
- `chore` - 构建/工具 🔧

**示例：**
```bash
git commit -m "feat: 添加图片裁剪功能"
git commit -m "fix: 修复内存泄漏"
git commit -m "docs: 更新 README"
```

## 🎯 版本号规范

遵循语义化版本：`vMAJOR.MINOR.PATCH`

```bash
v1.0.0  # MAJOR - 破坏性变更
v0.2.0  # MINOR - 新功能
v0.1.1  # PATCH - Bug 修复
```

## 🔄 自动化流程

标签推送后，GitHub Actions 会自动：

1. ✅ 生成 CHANGELOG.md（纯中文）
2. ✅ 更新版本号到所有配置文件
3. ✅ 提交更改到仓库
4. ✅ 创建 GitHub Release（含中文 Release Notes）
5. ✅ 多平台构建应用：
   - macOS ARM64
   - macOS x64
   - macOS Universal
   - Windows x64

## 🧪 测试 Changelog

在打标签前，可以预览生成的 changelog：

```bash
# 方法 1：使用 npm script
pnpm changelog:test 0.2.0

# 方法 2：直接运行
node scripts/test-changelog.cjs 0.2.0

# 查看生成的文件
cat CHANGELOG.md
```

## 📊 发布示例

### 场景 1：发布新功能版本

```bash
# 1. 确保所有代码已提交
git status

# 2. 测试 changelog
pnpm changelog:test 0.2.0

# 3. 如果满意，提交并推送
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG"
git push

# 4. 创建并推送标签
git tag v0.2.0
git push origin v0.2.0

# 5. 观察 Actions 运行
# 访问：https://github.com/cavin-works/cavin-tools/actions
```

### 场景 2：发布 Bug 修复版本

```bash
# 快速发布
git tag v0.1.1
git push origin v0.1.1
```

## 🛠️ 常用命令

```bash
# 查看所有标签
git tag

# 查看提交历史
git log --oneline -10

# 测试 changelog 生成
pnpm changelog:test <version>

# 同步版本号到配置文件
pnpm version:sync <version>

# 删除错误的标签
git tag -d v0.2.0              # 删除本地
git push origin --delete v0.2.0 # 删除远程
```

## 📚 详细文档

- [RELEASE.md](./RELEASE.md) - 完整发布流程文档
- [CHANGELOG.md](./CHANGELOG.md) - 更新日志

## ✅ 发布检查清单

发布前：
- [ ] 代码已推送到 master
- [ ] 提交符合规范（通过 commitlint）
- [ ] 版本号正确

发布后：
- [ ] GitHub Actions 运行成功
- [ ] Release 已创建
- [ ] Release Notes 显示正确
- [ ] 构建产物已上传

## 🎉 完成！

现在你可以开始使用了。记住：

1. **规范的提交** - 使用 `<type>: <subject>` 格式
2. **正确的标签** - 使用 `vX.Y.Z` 格式
3. **推送标签** - 触发自动发布

有问题？查看 [RELEASE.md](./RELEASE.md) 获取更多详情。
