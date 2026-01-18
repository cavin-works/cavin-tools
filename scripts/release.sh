#!/bin/bash
# 快速发布脚本

set -e

if [ -z "$1" ]; then
  echo "❌ 错误：请提供版本号"
  echo "用法: ./scripts/release.sh <version>"
  echo "示例: ./scripts/release.sh 0.2.0"
  exit 1
fi

VERSION=$1

echo "🚀 开始发布 v${VERSION}"
echo ""

# 1. 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  警告：存在未提交的更改"
  git status
  echo ""
  read -p "是否继续？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 2. 测试生成 changelog
echo "📝 生成 CHANGELOg..."
node scripts/test-changelog.cjs $VERSION

# 3. 显示生成的 notes
echo ""
read -p "是否满意生成的 changelog？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 取消发布"
  exit 1
fi

# 4. 提交 changelog
echo ""
echo "📤 提交 CHANGELOG..."
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 到 v${VERSION}"

# 5. 创建标签
echo "🏷️  创建标签 v${VERSION}..."
git tag v${VERSION}

# 6. 推送代码和标签
echo ""
echo "🚀 推送到远程仓库..."
git push
git push origin v${VERSION}

echo ""
echo "✅ 发布成功！"
echo ""
echo "📦 GitHub Actions 将自动："
echo "  - 更新版本号到配置文件"
echo "  - 创建 GitHub Release"
echo "  - 多平台构建应用"
echo ""
echo "🔗 查看构建进度："
echo "  https://github.com/cavin-works/cavin-tools/actions"
