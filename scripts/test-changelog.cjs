#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

const version = process.argv[2];

if (!version) {
  console.error('❌ 错误：请提供版本号');
  console.log('用法: node scripts/test-changelog.cjs <version>');
  console.log('示例: node scripts/test-changelog.cjs 0.2.0');
  process.exit(1);
}

console.log(`🧪 测试生成 v${version} 的 CHANGELOG\n`);

try {
  // 1. 生成 CHANGELOG
  console.log('📝 生成 CHANGELOG...');
  execSync(
    'npx conventional-changelog -p angular -i CHANGELOG.md -s -r 0',
    { stdio: 'inherit' }
  );

  // 2. 读取生成的 CHANGELOG
  console.log('\n📖 读取 CHANGELOG.md...');
  let content = fs.readFileSync('CHANGELOG.md', 'utf-8');

  // 3. 翻译为中文
  console.log('\n🌏 翻译为中文...');
  const translations = {
    '### Features': '### ✨ 新功能',
    '### Bug Fixes': '### 🐛 Bug 修复',
    '### Performance Improvements': '### ⚡ 性能优化',
    '### Documentation': '### 📝 文档',
    '### Tests': '### ✅ 测试',
    '### Build': '### 🔧 构建/工具',
    '### Refactor': '### ♻️ 重构',
    '### Styles': '### 💄 样式',
    '### Reverts': '### ⏪ 回退',
    '### CI': '### 👷 CI'
  };

  for (const [en, zh] of Object.entries(translations)) {
    content = content.replace(new RegExp(en, 'g'), zh);
  }

  // 4. 保存更新后的 CHANGELOG
  fs.writeFileSync('CHANGELOG.md', content);

  // 5. 提取当前版本部分
  console.log(`\n🔍 提取 v${version} 的 release notes...`);
  const versionPattern = new RegExp(
    `## \\[v?${version.replace(/\./g, '\\.')}(?:.*?)?\\]([\\s\\S]*?)(?=\\n## \\[|$)`,
    'i'
  );

  const match = content.match(versionPattern);

  if (match) {
    const currentNotes = match[1].trim();

    console.log('\n' + '='.repeat(60));
    console.log(`📦 v${version} Release Notes:`);
    console.log('='.repeat(60));
    console.log(currentNotes);
    console.log('='.repeat(60));

    console.log('\n✅ 成功！CHANGELOG.md 已更新');
    console.log('\n💡 提示：如果满意，可以提交更改：');
    console.log('   git add CHANGELOG.md');
    console.log(`   git commit -m "docs: 更新 CHANGELOG 到 v${version}"`);
  } else {
    console.log(`\n⚠️  警告：未找到 v${version} 的 changelog`);
    console.log('   可能是第一次发布或者没有符合条件的提交');
  }
} catch (error) {
  console.error('\n❌ 错误:', error.message);
  process.exit(1);
}
