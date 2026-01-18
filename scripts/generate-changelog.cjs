#!/usr/bin/env node
/**
 * 生成 CHANGELOG 并提取当前版本的 release notes
 * 用法: node scripts/generate-changelog.cjs <version>
 */

const fs = require('fs');
const { execSync } = require('child_process');

const version = process.argv[2];

if (!version) {
  console.error('❌ 错误：请提供版本号');
  process.exit(1);
}

console.log(`📝 生成 v${version} 的 CHANGELOG...\n`);

try {
  // 1. 生成 CHANGELOG
  // 如果 CHANGELOG.md 不存在，使用 --first-release
  const isFirstRelease = !fs.existsSync('CHANGELOG.md') ||
    fs.readFileSync('CHANGELOG.md', 'utf-8').trim().length === 0;

  const cmd = isFirstRelease
    ? 'npx conventional-changelog -p angular -i CHANGELOG.md -s -r 0 --first-release'
    : 'npx conventional-changelog -p angular -i CHANGELOG.md -s -r 0';

  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    // conventional-changelog 在没有新的 commits 时会失败，这是正常的
    console.log('⚠️  没有检测到新的变更');
  }

  // 2. 读取生成的 CHANGELOG
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

  // 匹配版本号格式：## [0.2.0] 或 ## [0.2.0] - 2025-01-18
  const versionPattern = new RegExp(
    `^##\\s+\\[${version.replace(/\./g, '\\.')}(\\s*-.*?|)\\]([\\s\\S]*?)(?=^##\\s+\\[|$)`,
    'm'
  );

  const match = content.match(versionPattern);

  let releaseNotes = '';
  let commitLink = '';

  if (match) {
    releaseNotes = match[2].trim();

    // 提取 commit hash 链接
    const lines = releaseNotes.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      // 获取最后一行，通常包含链接信息
      const lastLine = lines[lines.length - 1];
      if (lastLine.includes('https://github.com/')) {
        commitLink = lastLine.trim();
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📦 v${version} Release Notes:`);
    console.log('='.repeat(60));
    console.log(releaseNotes);
    console.log('='.repeat(60));
  } else {
    console.log(`\n⚠️  警告：未找到 v${version} 的 changelog`);
    console.log('   可能是第一次发布或者没有符合条件的提交');

    // 使用默认消息
    releaseNotes = `查看完整更新日志请访问 [CHANGELOG.md](https://github.com/${process.env.GITHUB_REPOSITORY || 'cavin-works/cavin-tools'}/blob/master/CHANGELOG.md)`;
  }

  // 6. 保存 release notes 到文件（供 GitHub Actions 使用）
  fs.writeFileSync('/tmp/release_notes.txt', releaseNotes);

  console.log('\n✅ CHANGELOG 生成完成');
  console.log('📝 Release notes 已保存到 /tmp/release_notes.txt');

} catch (error) {
  console.error('\n❌ 错误:', error.message);
  process.exit(1);
}
