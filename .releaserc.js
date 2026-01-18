export default {
  branches: ['master'],
  plugins: [
    // 1. 分析提交，确定版本号
    '@semantic-release/commit-analyzer',
    // 2. 生成 release notes（使用自定义格式）
    '@semantic-release/release-notes-generator',
    // 3. 更新 CHANGELOG.md
    [
      '@semantic-release/changelog',
      {
        'changelogFile': 'CHANGELOG.md',
        'changelogTitle': '# 更新日志\n\n所有项目重要更改都将记录在此文件中。\n'
      }
    ],
    // 4. 更新 package.json、Cargo.toml、tauri.conf.json
    [
      '@semantic-release/exec',
      {
        'prepareCmd': 'node scripts/sync-version.cjs ${nextRelease.version}'
      }
    ],
    // 5. 提交更新
    [
      '@semantic-release/git',
      {
        'assets': [
          'package.json',
          'CHANGELOG.md',
          'src-tauri/Cargo.toml',
          'src-tauri/tauri.conf.json'
        ],
        'message': 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    // 6. 创建 GitHub Release
    '@semantic-release/github'
  ],
  // 自定义 release notes 格式（纯中文）
  generateNotes: {
    preset: 'conventionalcommits',
    writerOpts: {
      transform: (commit, context) => {
        // 翻译提交类型为中文
        const typeMap = {
          feat: '✨ 新功能',
          fix: '🐛 Bug 修复',
          docs: '📝 文档',
          style: '💄 样式',
          refactor: '♻️ 重构',
          perf: '⚡ 性能优化',
          test: '✅ 测试',
          chore: '🔧 构建/工具',
          revert: '⏪ 回退'
        };

        const issues = [];

        commit.type = typeMap[commit.type] || commit.type;

        if (typeof commit.hash === 'string') {
          commit.hash = commit.hash.substring(0, 7);
        }

        if (typeof commit.subject === 'string') {
          let url = context.repository
            ? `${context.host}/${context.owner}/${context.repository}/issues/`
            : context.repoUrl + '/issues/';
          if (url.endsWith('/')) {
            url = url.slice(0, -1);
          }

          // 提取 issue 编号
          const issueRegex = /#([0-9]+)/g;

          commit.subject = commit.subject.replace(issueRegex, (_, issue) => {
            issues.push(issue);
            return `[#${issue}](${url}${issue})`;
          });
        }

        // 移除 commit.scope（保持简洁）
        commit.scope = null;

        return commit;
      },
      groupBy: 'type',
      commitGroupsSort: 'title',
      commitsSort: ['scope', 'subject'],
      noteGroupsSort: 'title'
    }
  }
};
