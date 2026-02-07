# skills.sh 技能发现与详情获取实施文档

> **项目**: Mnemosyne (Cavin Tools)
> **创建日期**: 2026-02-06
> **文档版本**: 1.0.0
> **状态**: 待实施

---

## 📋 目录

1. [功能概述](#功能概述)
2. [技能详情获取分析](#技能详情获取分析)
3. [实施方案对比](#实施方案对比)
4. [详细实施步骤](#详细实施步骤)
5. [组件实现](#组件实现)
6. [测试计划](#测试计划)
7. [注意事项](#注意事项)

---

## 功能概述

### 目标

在现有 AI 助手的 Skills 管理中新增以下功能：

1. ✅ **skills.sh 全量技能发现** - 展示 skills.sh 平台的全量技能列表
2. ✅ **技能搜索** - 支持关键词搜索
3. ✅ **技能详情** - 点击技能卡片查看完整信息（name, description, metadata, content）
4. ✅ **一键安装** - 从 skills.sh 技能列表直接安装到 SSOT 系统

### 用户价值

- 🎯 提供 43,000+ 技能选择
- 📊 展示热门技能和安装量统计
- 🔍 增强技能发现能力
- 🔄 无缝集成现有安装流程

---

## 技能详情获取分析

### ❌ 核心发现：skills.sh 没有提供单个技能详情 API

经过对 vercel-labs/skills 源码的深入分析，发现：

#### skills.sh 已知的 API 端点

| API 端点                     | 用途     | 返回数据                                            |
| ---------------------------- | -------- | --------------------------------------------------- |
| `GET /api/search?q=react`    | 搜索技能 | `{ skills: [{ source, skillId, name, installs }] }` |
| `GET /api/skills/all-time/1` | 全量榜单 | `{ skills: [{ source, skillId, name, installs }] }` |

#### ❌ 缺失的数据

**以上 API 只返回基本信息，不包含：**

- ❌ 技能描述 (`description`)
- ❌ 技能内容 (`SKILL.md` 内容)
- ❌ 元数据 (`metadata`)
- ❌ README 内容

---

### 🔍 skills CLI 如何获取技能详情

#### 完整流程（从源码分析）

```typescript
// 1. 用户执行: npx skills add owner/repo@skill-name
// 2. CLI 解析参数获取:
const { source, skillId } = parseSkillInput(
  "wshobson/agents@api-design-principles",
);

// 3. 克隆 GitHub 仓库到临时目录
const tempDir = await cloneRepo(
  `https://github.com/wshobson/agents.git`,
  "main",
);

// 4. 扫描 25+ 个可能的 SKILL.md 位置
const skillMdPath = await findSkillMd(tempDir, skillId);

// 5. 解析 SKILL.md 文件获取完整信息
const { data } = matter(readFileSync(skillMdPath, "utf8"));
const skillDetail = {
  name: data.name,
  description: data.description,
  metadata: data.metadata,
  rawContent: readFileSync(skillMdPath, "utf8"),
  path: dirname(skillMdPath),
};

// 6. 保存到 skill-lock.json
await saveToSkillLock(skillDetail);
```

#### SKILL.md 扫描路径（优先级排序）

```typescript
const PRIORITY_SEARCH_DIRS = [
  basePath, // 根目录
  join(basePath, "skills"), // skills/
  join(basePath, "skills/.curated"), // 精选
  join(basePath, "skills/.experimental"), // 实验性
  join(basePath, "skills/.system"), // 系统级
  join(basePath, ".agent/skills"), // Agent 规范
  join(basePath, ".agents/skills"), // 多 Agent 支持
  join(basePath, ".claude/skills"), // Claude 专用
  join(basePath, ".cline/skills"), // Cline 专用
  join(basePath, ".codex/skills"), // Codex 专用
  join(basePath, ".commandcode/skills"), // Command Code 专用
  join(basePath, ".continue/skills"), // Continue 专用
  join(basePath, ".cursor/skills"), // Cursor 专用
  join(basePath, ".opencode/skills"), // OpenCode 专用
  join(basePath, ".github/skills"), // GitHub 规范
  // ... 15+ 更多特定代理路径
];
```

---

## 实施方案对比

### 方案一：克隆仓库解析 SKILL.md（推荐，与 skills CLI 一致）

#### 优点

- ✅ **获取完整技能信息**：name, description, metadata, content
- ✅ **与 skills CLI 行为一致**：用户体验统一
- ✅ **支持所有类型的仓库**：GitHub, GitLab, 本地路径
- ✅ **不依赖 skills.sh API**：避免 API 限制

#### 缺点

- ⚠️ **需要克隆整个仓库**：较慢（~10秒）
- ⚠️ **需要磁盘空间**：临时文件占用
- ⚠️ **需要清理临时文件**：增加复杂度

#### 适用场景

- 🔹 用户点击技能卡片查看详情
- 🔹 需要展示完整的 SKILL.md 内容
- 🔹 需要查看 metadata 信息

---

### 方案二：使用 GitHub API（更快，但不完整）

#### 优点

- ✅ **更快**：仅 1-2 秒
- ✅ **不需要磁盘空间**
- ✅ **支持缓存**

#### 缺点

- ⚠️ **只能获取基本信息**：name, description (from README), stars, forks
- ⚠️ **无法获取完整的 SKILL.md 内容**
- ⚠️ **metadata 信息可能缺失**
- ⚠️ **需要处理 GitHub API 速率限制**：60 次/小时

#### 适用场景

- 🔹 快速预览技能基本信息
- 🔹 在列表页展示部分信息（不点击详情）
- 🔹 技能统计页面（不展示具体内容）

---

## 详细实施步骤

### 阶段一：后端 API 实现（Rust + Tauri）

#### 文件：`src-tauri/src/skills_sh_commands.rs`

```rust
//! Skills.sh 技能详情获取功能
//! 通过克隆 GitHub 仓库并解析 SKILL.md 文件获取完整技能信息

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

/// 技能详情（完整信息）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDetail {
    /// 技能名称
    pub name: String,

    /// 技能描述
    pub description: String,

    /// 元数据（YAML frontmatter）
    pub metadata: serde_json::Value,

    /// 原始 SKILL.md 内容
    pub raw_content: String,

    /// SKILL.md 文件在克隆仓库中的路径
    pub path: String,

    /// 仓库 URL（完整 GitHub URL）
    pub source_url: String,

    /// skills.sh 详情页 URL
    pub skills_sh_url: String,
}

/// 克隆 GitHub 仓库并解析 SKILL.md
#[tauri::command]
pub async fn fetch_skill_details_from_source(
    source: String,        // "owner/repo" 或完整 URL
    skill_id: Option<String>,  // 可选的 skillId
) -> Result<SkillDetail, String> {
    log::info!("Fetching skill details: source={}, skill_id={:?}", source, skill_id);

    // 1. 构造 GitHub URL
    let github_url = if source.starts_with("http") {
        source.clone()
    } else {
        format!("https://github.com/{}.git", source)
    };

    // 2. 创建临时目录
    let temp_dir = tempfile::tempdir()
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let temp_dir_path = temp_dir.path();

    // 3. 克隆仓库
    log::info!("Cloning repository: {}", github_url);
    let git_clone_output = Command::new("git")
        .args([
            "clone",
            "--depth", "1",
            "--single-branch",
            &github_url,
            temp_dir_path.to_str().unwrap()
        ])
        .output()?;

    if !git_clone_output.status.success() {
        cleanup_temp_dir(&temp_dir)?;
        return Err(format!("Failed to clone repository: {:?}", git_clone_output));
    }

    log::info!("Repository cloned successfully");

    // 4. 查找 SKILL.md 文件
    let skill_md_path = match find_skill_md(&temp_dir_path, skill_id.as_deref()) {
        Ok(path) => path,
        Err(e) => {
            cleanup_temp_dir(&temp_dir)?;
            return Err(e);
        }
    };

    // 5. 读取 SKILL.md 文件
    let content = std::fs::read_to_string(&skill_md_path)
        .map_err(|e| format!("Failed to read SKILL.md: {}", e))?;

    // 6. 解析 frontmatter (使用 gray-matter Rust 等效物)
    let (frontmatter_start, frontmatter_end) = if let Some(start) = content.find("---") {
        let end = content[start + 3..].find("---")
            (start, end)
    } else {
        return Err("Invalid SKILL.md format: missing frontmatter".to_string());
    };

    let frontmatter = &content[frontmatter_start..frontmatter_end];
    let body = &content[frontmatter_end..];

    // 解析 YAML frontmatter（简化版，仅提取 name 和 description）
    let name = extract_yaml_field(frontmatter, "name")
        .unwrap_or_else(|| "Unknown Skill".to_string());
    let description = extract_yaml_field(frontmatter, "description")
        .unwrap_or_else(|| "No description".to_string());

    // 7. 提取 metadata
    let metadata = serde_json::to_value(frontmatter)
        .unwrap_or(serde_json::json!({}));

    // 8. 清理临时目录
    cleanup_temp_dir(&temp_dir)?;

    log::info!("Skill details fetched successfully: {}", name);

    // 9. 返回完整详情
    Ok(SkillDetail {
        name,
        description,
        metadata,
        raw_content: content,
        path: skill_md_path.to_str().unwrap().to_string(),
        source_url: github_url,
        skills_sh_url: format!("https://skills.sh/{}/{}", source),
    })
}

/// 在临时目录中查找 SKILL.md 文件
fn find_skill_md(temp_dir: &PathBuf, skill_id: &str) -> Result<PathBuf, String> {
    // 优先搜索路径（与 skills CLI 一致）
    let priority_paths = [
        temp_dir.clone(),
        temp_dir.join("skills"),
        temp_dir.join("skills").join(".curated"),
        temp_dir.join("skills").join(".experimental"),
        temp_dir.join("skills").join(".system"),
        temp_dir.join(".agent").join("skills"),
        temp_dir.join(".agents").join("skills"),
        temp_dir.join(".claude").join("skills"),
        temp_dir.join(".cline").join("skills"),
        temp_dir.join(".codex").join("skills"),
        temp_dir.join(".commandcode").join("skills"),
        temp_dir.join(".continue").join("skills"),
        temp_dir.join(".cursor").join("skills"),
        temp_dir.join(".github").join("skills"),
        temp_dir.join(".opencode").join("skills"),
        temp_dir.join(".openhands").join("skills"),
        temp_dir.join(".pi").join("skills"),
        temp_dir.join(".qoder").join("skills"),
        temp_dir.join(".roo").join("skills"),
        temp_dir.join(".trae").join("skills"),
        temp_dir.join(".windsurf").join("skills"),
        temp_dir.join(".zencoder").join("skills"),
    ];

    // 如果指定了 skill_id，在特定目录查找
    if let Some(id) = skill_id {
        for path in priority_paths {
            let skill_md = path.join(id).join("SKILL.md");
            if skill_md.exists() {
                return Ok(skill_md);
            }
        }
    }
    }

    // 否则，遍历所有路径查找任何 SKILL.md
    for path in priority_paths {
        if path.join("SKILL.md").exists() {
            return Ok(path.join("SKILL.md"));
        }

        // 遍历子目录
        if let Ok(entries) = std::fs::read_dir(&path) {
            for entry in entries {
                let entry_path = path.join(&entry.file_name());
                if entry_path.join("SKILL.md").exists() {
                    return Ok(entry_path.join("SKILL.md"));
                }
            }
        }
    }
    }

    Err("SKILL.md not found in repository".to_string())
}

/// 从 YAML frontmatter 提取字段
fn extract_yaml_field(frontmatter: &str, field: &str) -> Option<String> {
    frontmatter
        .lines()
        .find(|line| line.starts_with(&format!("{}:", field)))
        .and_then(|line| {
            line.strip_prefix(&format!("{}:", field))
                .map(|s| s.trim().to_string())
        })
}

/// 清理临时目录
fn cleanup_temp_dir(temp_dir: &tempfile::TempDir) -> Result<(), String> {
    if let Some(path) = temp_dir.path() {
        // 安全删除（仅删除临时目录内的文件）
        std::fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to cleanup temp dir: {}", e))?;
    }
    Ok(())
}
```

#### 修改文件：`src-tauri/src/commands/skill.rs`

```rust
// 在现有 skill.rs 中添加新命令的导出

mod skills_sh_commands;

pub use skills_sh_commands::SkillDetail;
pub use skills_sh_commands::fetch_skill_details_from_source;
```

#### 修改文件：`src-tauri/src/lib.rs`

```rust
// 在 lib.rs 中注册新的 Tauri 命令

mod skills_sh_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[cfg_attr(not(mobile), tauri::command_handler)]
fn generate_handler() -> impl FnOnce(tauri::generate::Context) {
    // ... 现有代码 ...

    skills_sh_commands::fetch_skill_details_from_source
}
```

#### 修改文件：`Cargo.toml`

```toml
[dependencies]
# 添加新依赖
tempfile = "3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

---

### 阶段二：前端类型定义（TypeScript）

#### 文件：`src/tools/ai-assistant/types/skillsSh.ts`

```typescript
//! Skills.sh 技能类型定义

/**
 * Skills.sh 技能项（列表数据）
 */
export interface SkillsShSkill {
  /** 技能来源仓库 (owner/repo) */
  source: string;

  /** 技能唯一 ID */
  skillId: string;

  /** 技能名称 */
  name: string;

  /** 安装量 */
  installs: number;

  /** 完整的包标识（用于安装）*/
  get package(): string;
}

/**
 * Skills.sh API 响应（列表）
 */
export interface SkillsShResponse {
  /** 技能列表 */
  skills: SkillsShSkill[];

  /** 技能总数 */
  total: number;

  /** 是否有更多数据 */
  hasMore: boolean;

  /** 当前页码 */
  page: number;
}

/**
 * API 查询参数
 */
export interface SkillsShQueryParams {
  /** 页码（从 1 开始）*/
  page?: number;

  /** 每页数量 */
  limit?: number;

  /** 搜索关键词（可选）*/
  query?: string;
}

/**
 * 技能详情（完整信息）
 */
export interface SkillDetail {
  /** 技能名称 */
  name: string;

  /** 技能描述 */
  description: string;

  /** 元数据（YAML frontmatter）*/
  metadata: Record<string, unknown>;

  /** 原始 SKILL.md 内容 */
  rawContent: string;

  /** SKILL.md 文件路径 */
  path: string;

  /** 仓库 URL（完整 GitHub URL）*/
  sourceUrl: string;

  /** skills.sh 详情页 URL */
  skillsShUrl: string;

  /** 安装量 */
  installs?: number;
}

/**
 * 加载状态
 */
export type SkillsShLoadingState = "idle" | "loading" | "success" | "error";

/**
 * 技能列表数据
 */
export interface SkillsShListData {
  /** 技能列表 */
  skills: SkillsShSkill[];

  /** 加载状态 */
  loading: SkillsShLoadingState;

  /** 错误信息 */
  error: string | null;

  /** 分页信息 */
  pagination: {
    page: number;
    hasMore: boolean;
    total: number;
  };
}
```

---

### 阶段三：React 组件实现

#### 文件：`src/tools/ai-assistant/components/skills/SkillsDiscoveryPage.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ExternalLink, Download, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@ai-assistant/components/ui/button';
import { Input } from '@ai-assistant/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@ai-assistant/components/ui/dialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type {
  SkillsShSkill,
  SkillsShResponse,
  SkillsShQueryParams,
  SkillsShListData,
  SkillDetail,
} from '@ai-assistant/types/skillsSh';

const DEFAULT_LIMIT = 20;

/**
 * Skills.sh 技能发现页面
 */
export const SkillsDiscoveryPage: React.FC = () => {
  const { t } = useTranslation();

  // 列表数据状态
  const [data, setData] = useState<SkillsShListData>({
    skills: [],
    loading: 'idle',
    error: null,
    pagination: {
      page: 1,
      hasMore: true,
      total: 0,
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 详情弹窗状态
  const [selectedSkill, setSelectedSkill] = useState<SkillsShSkill | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 格式化安装量
  const formatInstalls = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // 获取技能列表
  const fetchSkills = useCallback(async (page: number = 1) => {
    setData((prev) => ({
      ...prev,
      loading: 'loading',
      error: null,
    }));

    try {
      const response: SkillsShResponse = await invoke<SkillsShResponse>('fetch_skills_sh', {
        page,
        limit: DEFAULT_LIMIT,
        query: debouncedQuery || undefined,
      });

      setData({
        skills: response.skills,
        loading: 'success',
        error: null,
        pagination: {
          page: response.page,
          hasMore: response.hasMore,
          total: response.total,
        },
      });

      toast.success(t('skills.skillsShLoaded', {
        count: response.skills.length,
        total: response.total
      }));
    } catch (error) {
      console.error('Failed to fetch skills.sh:', error);
      setData((prev) => ({
        ...prev,
        loading: 'error',
        error: error as string,
      }));

      toast.error(t('skills.skillsShError'), {
        description: error as string,
      });
    }
  }, [debouncedQuery]);

  // 加载更多
  const handleLoadMore = () => {
    if (!data.pagination.hasMore || data.loading !== 'idle') return;
    fetchSkills(data.pagination.page + 1);
  };

  // 刷新
  const handleRefresh = () => {
    setSearchQuery('');
    fetchSkills(1);
  };

  // 打开详情弹窗
  const handleOpenDetail = (skill: SkillsShSkill) => {
    setSelectedSkill(skill);
    setDetailDialogOpen(true);
    setSkillDetail(null);
  };

  // 获取技能详情
  const fetchDetail = async (skill: SkillsShSkill) => {
    setDetailLoading(true);
    try {
      const detail: SkillDetail = await invoke<SkillDetail>('fetch_skill_details_from_source', {
        source: skill.source,
        skill_id: skill.skillId,
      });

      setSkillDetail(detail);
    } catch (error) {
      console.error('Failed to fetch skill details:', error);
      toast.error(t('skills.fetchDetailFailed'), {
        description: error as string,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setTimeout(() => {
      setSelectedSkill(null);
      setSkillDetail(null);
    }, 300);
  };

  // 复制安装命令
  const copyInstallCommand = () => {
    if (!selectedSkill) return;
    const command = `npx skills add ${selectedSkill.source}@${selectedSkill.skillId}`;
    navigator.clipboard.writeText(command);
    toast.success(t('skills.installCommandCopied'));
  };

  // 跳转到 skills.sh
  const openSkillsSh = () => {
    if (!selectedSkill) return;
    window.open(
      `https://skills.sh/${selectedSkill.source}/${selectedSkill.skillId}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // 处理安装
  const handleInstall = async () => {
    if (!selectedSkill) return;

    // 关闭详情弹窗
    setDetailDialogOpen(false);

    try {
      // 调用现有安装流程（集成 SSOT 系统）
      await invoke('install_skill_from_source', {
        source: selectedSkill.source,
        skill_id: selectedSkill.skillId,
      });

      toast.success(t('skills.installSuccess'), {
        description: t('skills.skillInstalled', { name: selectedSkill.name }),
      });
    } catch (error) {
      console.error('Failed to install skill:', error);
      toast.error(t('skills.installFailed'), {
        description: error as string,
      });
    }
  };

  // 当弹窗打开时，如果还没获取详情，则自动获取
  useEffect(() => {
    if (detailDialogOpen && selectedSkill && !skillDetail) {
      fetchDetail(selectedSkill);
    }
  }, [detailDialogOpen, selectedSkill]);

  // 过滤后的列表
  const filteredSkills = React.useMemo(() => {
    if (!searchQuery) return data.skills;

    const query = searchQuery.toLowerCase();
    return data.skills.filter((skill) =>
      skill.name.toLowerCase().includes(query) ||
      skill.source.toLowerCase().includes(query)
    );
  }, [data.skills, searchQuery]);

  return (
    <div className="px-6 py-4 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            {t('skills.skillsShDiscovery')}
          </h1>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {t('skills.totalSkills', {
                count: data.pagination.total
              })}
            </span>
            {data.pagination.total > 0 && (
              <>
                <span>·</span>
                <span>
                  {t('skills.fetchedCount', {
                    count: filteredSkills.length
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder={t('skills.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={data.loading === 'loading'}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 状态提示 */}
      {data.loading === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <RefreshCw className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      )}

      {data.loading === 'error' && (
        <div className="flex flex-col items-center justify-center py-12 text-destructive">
          <div className="mb-4">
            <Sparkles className="w-12 h-12" />
          </div>
          <p className="text-center text-lg font-medium">
            {t('skills.skillsShError')}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            {data.error}
          </p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.retry')}
          </Button>
        </div>
      )}

      {/* 技能列表 */}
      {data.loading === 'idle' && filteredSkills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('skills.noResults')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('skills.tryDifferentKeywords')}
          </p>
        </div>
      )}

      {data.loading === 'idle' && filteredSkills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.skillId}
              onClick={() => handleOpenDetail(skill)}
              className="group relative p-4 rounded-xl border border-border-default bg-card hover:bg-muted hover:border-border-default/80 transition-all duration-300 cursor-pointer"
            >
              {/* 技能信息 */}
              <div className="mb-3">
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {skill.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {skill.source}
                </p>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  <span>
                    {formatInstalls(skill.installs)}
                  </span>
                </div>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </div>

              {/* 安装按钮 */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstall();
                }}
                size="sm"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('skills.install')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {data.loading === 'idle' && data.pagination.hasMore && filteredSkills.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            disabled={data.loading === 'loading'}
            variant="outline"
            size="lg"
          >
            {t('skills.loadMore')}
          </Button>
        </div>
      )}

      {/* 技能详情弹窗 */}
      <Dialog open={detailDialogOpen} onOpenChange={handleCloseDetail}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin">
                <RefreshCw className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
          ) : skillDetail ? (
            <>
              {/* 头部 */}
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                      {skillDetail.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {skillDetail.source}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={openSkillsSh}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6 space-y-6">
                {/* 技能描述 */}
                {skillDetail.description && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('skills.description')}
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">
                      {skillDetail.description}
                    </p>
                  </section>
                )}

                {/* 元数据 */}
                {Object.keys(skillDetail.metadata).length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {t('skills.metadata')}
                    </h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(skillDetail.metadata, null, 2)}
                      </pre>
                    </div>
                  </section>
                )}

                {/* SKILL.md 内容 */}
                <section className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('skills.skillContent')}
                  </h4>
                  <div className="rounded-lg bg-muted/50 p-4 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-foreground font-mono">
                      {skillDetail.rawContent}
                    </pre>
                  </div>
                </section>

                {/* 统计信息 */}
                <section className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('skills.statistics')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t('skills.installs')}:
                      </span>
                      <span className="font-medium text-foreground">
                        {selectedSkill?.installs ? formatInstalls(selectedSkill.installs) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={skillDetail.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline font-medium"
                      >
                        {t('skills.viewOnGitHub')}
                      </a>
                    </div>
                  </div>
                </section>

                {/* 安装命令 */}
                <section className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t('skills.quickInstall')}
                  </h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono text-foreground">
                      npx skills add {selectedSkill?.source}@{selectedSkill?.skillId}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyInstallCommand}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </section>
              </div>

              {/* 底部 */}
              <DialogFooter>
                <Button
                  onClick={handleInstall}
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('skills.install')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

---

### 阶段四：国际化配置

#### 文件：`src/tools/ai-assistant/locales/zh-CN/skills.json`

```json
{
  "skills": {
    "title": "技能管理",
    "skillsShDiscovery": "Skills.sh 技能发现",
    "totalSkills": "总技能数",
    "fetchedCount": "已获取 {count}",
    "noResults": "未找到技能",
    "tryDifferentKeywords": "尝试其他关键词",
    "loadMore": "加载更多",
    "description": "描述",
    "metadata": "元数据",
    "statistics": "统计信息",
    "installs": "安装量",
    "viewOnGitHub": "在 GitHub 查看",
    "viewOnSkillsSh": "在 skills.sh 查看",
    "skillContent": "技能内容 (SKILL.md)",
    "quickInstall": "快速安装",
    "install": "安装",
    "installCommandCopied": "安装命令已复制到剪贴板",
    "installSuccess": "技能安装成功",
    "skillInstalled": "{name} 已安装",
    "installFailed": "安装失败",
    "skillsShLoaded": "从 skills.sh 加载了 {count} 个技能（共 {total} 个）",
    "skillsShError": "加载 skills.sh 技能失败",
    "fetchDetailFailed": "获取技能详情失败",
    "searchPlaceholder": "搜索技能...",
    "close": "关闭"
    "loadingDetail": "加载技能详情..."
  }
}
```

---

## 测试计划

### 单元测试

#### 后端测试：`src-tauri/src/skills_sh_commands.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_skill_details_success() {
        // Mock 成功场景
        let temp_dir = tempfile::tempdir().unwrap();

        // 创建测试仓库结构
        let skill_dir = temp_dir.path().join("skills").join("test-skill");
        std::fs::create_dir_all(&skill_dir).unwrap();

        let skill_md = skill_dir.join("SKILL.md");
        let content = r#"---
name: test-skill
description: A test skill
---
# Test Skill

This is a test skill for unit testing.
"#;
        std::fs::write(&skill_md, content).unwrap();

        // 测试查找功能
        let result = find_skill_md(&temp_dir.path(), Some("test-skill".to_string()));
        assert!(result.is_ok());

        let found_path = result.unwrap();
        assert!(found_path.exists());
    }

    #[tokio::test]
    async fn test_cleanup_temp_dir() {
        let temp_dir = tempfile::tempdir().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        std::fs::write(&test_file, "test content").unwrap();

        // 清理应该成功
        let result = cleanup_temp_dir(&temp_dir);
        assert!(result.is_ok());

        // 文件应该被删除
        assert!(!test_file.exists());
    }
}
```

#### 前端测试：`src/tools/ai-assistant/components/skills/SkillsDiscoveryPage.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkillsDiscoveryPage } from './SkillsDiscoveryPage';

describe('SkillsDiscoveryPage', () => {
  it('should render loading state', () => {
    render(<SkillsDiscoveryPage />);

    expect(screen.getByText(/加载技能.../i)).toBeInTheDocument();
  });

  it('should render skill cards', async () => {
    render(<SkillsDiscoveryPage />);

    await waitFor(() => {
      const cards = screen.getAllByText(/test-skill/i);
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('should open detail dialog on click', async () => {
    render(<SkillsDiscoveryPage />);

    await waitFor(() => {
      const skillCard = screen.getByText(/test-skill/i);
      fireEvent.click(skillCard);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
```

---

## 注意事项

### API 限制

1. **GitHub API 速率限制**: 60 次/小时
   - **解决方案**: 实现缓存机制，避免重复请求
   - **降级策略**: 达到限制时，改用克隆方式

2. **克隆操作**: 需要 ~10 秒完成
   - **用户体验**: 显示清晰的加载状态
   - **进度提示**: 显示"正在克隆仓库..."

3. **磁盘空间**: 临时目录可能占用较大空间
   - **清理策略**: 立即清理临时文件
   - **错误处理**: 清理失败不阻塞主流程

### 用户体验

1. **加载反馈**: 清晰的加载和错误状态
2. **空状态**: 优雅的空状态展示
3. **错误恢复**: 明确的重试机制
4. **跳转提示**: 技能安装后需要返回页面

### 安全考虑

1. **输入验证**: 搜索关键词需要转义和验证
2. **URL 安全**: 跳转使用 `noopener,noreferrer`
3. **路径安全**: 临时目录清理，确保不会删除非预期文件

### 性能优化

1. **防抖搜索**: 300ms 防抖
2. **缓存机制**: 已获取的技能详情缓存
3. **虚拟滚动**: 考虑使用虚拟滚动（React Virtual 或 react-window-size-selector）
4. **懒加载**: 分页加载，避免一次性渲染 43,000+ 项

---

## 实施优先级

| 任务             | 优先级 | 预计工作量 |
| ---------------- | ------ | ---------- |
| ✅ 后端 API 实现 | P0     | 4 小时     |
| ✅ 前端类型定义  | P0     | 1 小时     |
| ✅ 列表页面组件  | P0     | 6 小时     |
| ✅ 详情弹窗组件  | P0     | 4 小时     |
| ✅ 国际化配置    | P1     | 1 小时     |
| ⚠️ 缓存机制      | P1     | 3 小时     |
| ⚠️ 虚拟滚动优化  | P2     | 6 小时     |

---

## 后续优化方向

1. **分类浏览**: 按技术栈、框架、工具类型分类
2. **趋势分析**: 展示热门技能趋势（周榜、月榜）
3. **推荐系统**: 基于已安装技能推荐相关技能
4. **批量操作**: 支持批量安装和卸载
5. **本地缓存**: 使用 IndexedDB 缓存已浏览的技能
6. **技能评价**: 集成技能评价和评论功能
7. **技能提交**: 提交自定义技能到 skills.sh
8. **更新检查**: 定期检查已安装技能的更新

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-06  
**维护者**: Sisyphus AI Agent
