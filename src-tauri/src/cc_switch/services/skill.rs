//! Skills 服务层
//!
//! v3.10.0+ 统一管理架构：
//! - SSOT（单一事实源）：`~/.config/mnemosyne/skills/`
//! - 安装时下载到 SSOT，按需同步到各应用目录
//! - 数据库存储安装记录和启用状态

use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;

use crate::cc_switch::app_config::{AppType, InstalledSkill, SkillApps, UnmanagedSkill};
use crate::cc_switch::config::get_skills_dir;
use crate::cc_switch::database::dao::skill_cache::{RepoTreeCacheRow, SkillCacheRow};
use crate::cc_switch::database::Database;
use crate::cc_switch::error::format_skill_error;

/// Git clone 超时（对齐 vercel-labs/skills 的 CLONE_TIMEOUT_MS = 60000）
const CLONE_TIMEOUT_SECS: u64 = 60;

// ========== 数据结构 ==========

/// Skill 同步方式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SyncMethod {
    /// 自动选择：优先 symlink，失败时回退到 copy
    #[default]
    Auto,
    /// 符号链接（推荐，节省磁盘空间）
    Symlink,
    /// 文件复制（兼容模式）
    Copy,
}

/// 可发现的技能（来自仓库）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverableSkill {
    /// 唯一标识: "owner/name:directory"
    pub key: String,
    /// 显示名称 (从 SKILL.md 解析)
    pub name: String,
    /// 技能描述
    pub description: String,
    /// 目录名称 (安装路径的最后一段)
    pub directory: String,
    /// GitHub README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
    /// 仓库所有者
    #[serde(rename = "repoOwner")]
    pub repo_owner: String,
    /// 仓库名称
    #[serde(rename = "repoName")]
    pub repo_name: String,
    /// 分支名称
    #[serde(rename = "repoBranch")]
    pub repo_branch: String,
    /// Git 树 SHA（来自 GitHub Trees API）
    #[serde(rename = "treeSha", skip_serializing_if = "Option::is_none")]
    pub tree_sha: Option<String>,
}

/// 技能对象（兼容旧 API，内部使用 DiscoverableSkill）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// 唯一标识: "owner/name:directory" 或 "local:directory"
    pub key: String,
    /// 显示名称 (从 SKILL.md 解析)
    pub name: String,
    /// 技能描述
    pub description: String,
    /// 目录名称 (安装路径的最后一段)
    pub directory: String,
    /// GitHub README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
    /// 是否已安装
    pub installed: bool,
    /// 仓库所有者
    #[serde(rename = "repoOwner")]
    pub repo_owner: Option<String>,
    /// 仓库名称
    #[serde(rename = "repoName")]
    pub repo_name: Option<String>,
    /// 分支名称
    #[serde(rename = "repoBranch")]
    pub repo_branch: Option<String>,
}

/// 仓库配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillRepo {
    /// GitHub 用户/组织名
    pub owner: String,
    /// 仓库名称
    pub name: String,
    /// 分支 (默认 "main")
    pub branch: String,
    /// 是否启用
    pub enabled: bool,
}

/// 技能安装状态（旧版兼容）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillState {
    /// 是否已安装
    pub installed: bool,
    /// 安装时间
    #[serde(rename = "installedAt")]
    pub installed_at: DateTime<Utc>,
}

/// 持久化存储结构（仓库配置）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStore {
    /// directory -> 安装状态（旧版兼容，新版不使用）
    pub skills: HashMap<String, SkillState>,
    /// 仓库列表
    pub repos: Vec<SkillRepo>,
}

impl Default for SkillStore {
    fn default() -> Self {
        SkillStore {
            skills: HashMap::new(),
            repos: vec![
                // Claude 官方仓库
                SkillRepo {
                    owner: "anthropics".to_string(),
                    name: "skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
                // Claude 社区仓库
                SkillRepo {
                    owner: "ComposioHQ".to_string(),
                    name: "awesome-claude-skills".to_string(),
                    branch: "master".to_string(),
                    enabled: true,
                },
                SkillRepo {
                    owner: "cexll".to_string(),
                    name: "myclaude".to_string(),
                    branch: "master".to_string(),
                    enabled: true,
                },
                SkillRepo {
                    owner: "JimLiu".to_string(),
                    name: "baoyu-skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
                // Cursor 社区仓库
                SkillRepo {
                    owner: "grapelike-class151".to_string(),
                    name: "cursor-skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
                SkillRepo {
                    owner: "araguaci".to_string(),
                    name: "cursor-skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
            ],
        }
    }
}

/// 技能元数据 (从 SKILL.md 解析)
#[derive(Debug, Clone, Deserialize)]
pub struct SkillMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
}

/// GitHub Trees API 响应（对齐 vercel-labs/skills 的 fetchSkillFolderHash）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubTreeResponse {
    pub sha: String,
    pub tree: Vec<GitHubTreeEntry>,
    #[serde(default)]
    pub truncated: bool,
}

/// GitHub Trees API 单条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubTreeEntry {
    pub path: String,
    pub mode: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub sha: String,
}

/// 更新检测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillUpdateInfo {
    #[serde(rename = "repoOwner")]
    pub repo_owner: String,
    #[serde(rename = "repoName")]
    pub repo_name: String,
    #[serde(rename = "updatedSkills")]
    pub updated_skills: Vec<String>,
    #[serde(rename = "newSkills")]
    pub new_skills: Vec<String>,
    #[serde(rename = "removedSkills")]
    pub removed_skills: Vec<String>,
}

/// 已安装技能远程刷新结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillRemoteRefreshResult {
    #[serde(rename = "checkedRepos")]
    pub checked_repos: usize,
    #[serde(rename = "scannedSkills")]
    pub scanned_skills: usize,
    #[serde(rename = "updatedSkills")]
    pub updated_skills: usize,
}

/// 单个已安装技能远程刷新结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillSingleRemoteRefreshResult {
    #[serde(rename = "skillId")]
    pub skill_id: String,
    #[serde(rename = "updated")]
    pub updated: bool,
    #[serde(rename = "matchedRemote")]
    pub matched_remote: bool,
    #[serde(rename = "treeCommitId", skip_serializing_if = "Option::is_none")]
    pub tree_commit_id: Option<String>,
}

// ========== SkillService ==========

pub struct SkillService;

impl Default for SkillService {
    fn default() -> Self {
        Self::new()
    }
}

impl SkillService {
    pub fn new() -> Self {
        Self
    }

    // ========== 路径管理 ==========

    /// 获取 SSOT 目录（~/.config/mnemosyne/skills/）
    pub fn get_ssot_dir() -> Result<PathBuf> {
        let dir = get_skills_dir();
        fs::create_dir_all(&dir)?;
        Ok(dir)
    }

    /// 获取应用的 skills 目录
    pub fn get_app_skills_dir(app: &AppType) -> Result<PathBuf> {
        // 目录覆盖：优先使用用户在 settings.json 中配置的 override 目录
        match app {
            AppType::Claude => {
                if let Some(custom) = crate::cc_switch::settings::get_claude_override_dir() {
                    return Ok(custom.join("skills"));
                }
            }
            AppType::Codex => {
                if let Some(custom) = crate::cc_switch::settings::get_codex_override_dir() {
                    return Ok(custom.join("skills"));
                }
            }
            AppType::Gemini => {
                if let Some(custom) = crate::cc_switch::settings::get_gemini_override_dir() {
                    return Ok(custom.join("skills"));
                }
            }
            AppType::OpenCode => {
                if let Some(custom) = crate::cc_switch::settings::get_opencode_override_dir() {
                    return Ok(custom.join("skills"));
                }
            }
            AppType::Cursor => {
                if let Some(custom) = crate::cc_switch::settings::get_cursor_override_dir() {
                    return Ok(custom.join("skills-cursor"));
                }
            }
        }

        // 默认路径：回退到用户主目录下的标准位置
        let home = dirs::home_dir().context(format_skill_error(
            "GET_HOME_DIR_FAILED",
            &[],
            Some("checkPermission"),
        ))?;

        Ok(match app {
            AppType::Claude => home.join(".claude").join("skills"),
            AppType::Codex => home.join(".codex").join("skills"),
            AppType::Gemini => home.join(".gemini").join("skills"),
            AppType::OpenCode => home.join(".config").join("opencode").join("skills"),
            AppType::Cursor => home.join(".cursor").join("skills-cursor"),
        })
    }

    // ========== 统一管理方法 ==========

    /// 获取所有已安装的 Skills
    pub fn get_all_installed(db: &Arc<Database>) -> Result<Vec<InstalledSkill>> {
        let mut skills: Vec<InstalledSkill> = db.get_all_installed_skills()?.into_values().collect();

        for skill in &mut skills {
            if skill
                .tree_commit_id
                .as_ref()
                .is_some_and(|value| !value.trim().is_empty())
            {
                continue;
            }

            let (Some(repo_owner), Some(repo_name)) = (&skill.repo_owner, &skill.repo_name) else {
                continue;
            };

            let caches = match db.get_skill_caches_by_repo(repo_owner, repo_name) {
                Ok(rows) => rows,
                Err(error) => {
                    log::debug!(
                        "读取 skill_cache 失败（{}/{}）: {}",
                        repo_owner,
                        repo_name,
                        error
                    );
                    continue;
                }
            };

            let normalized_directory = skill.directory.trim().trim_matches('/').to_lowercase();
            let matched_sha = caches.into_iter().find_map(|row| {
                if row.tree_sha.trim().is_empty() {
                    return None;
                }
                let cached_directory = row.skill_directory.trim().trim_matches('/').to_lowercase();
                if cached_directory == normalized_directory
                    || cached_directory.ends_with(&format!("/{normalized_directory}"))
                {
                    return Some(row.tree_sha);
                }
                None
            });

            if let Some(tree_sha) = matched_sha {
                skill.tree_commit_id = Some(tree_sha);
                if let Err(error) = db.save_skill(skill) {
                    log::debug!("回填 tree_commit_id 到数据库失败（{}）: {}", skill.id, error);
                }
            }
        }

        Ok(skills)
    }

    /// 安装 Skill
    ///
    /// 流程：
    /// 1. 下载到 SSOT 目录
    /// 2. 保存到数据库
    /// 3. 同步到启用的应用目录
    pub async fn install(
        &self,
        db: &Arc<Database>,
        skill: &DiscoverableSkill,
        current_app: &AppType,
    ) -> Result<InstalledSkill> {
        let ssot_dir = Self::get_ssot_dir()?;
        let repo = SkillRepo {
            owner: skill.repo_owner.clone(),
            name: skill.repo_name.clone(),
            branch: skill.repo_branch.clone(),
            enabled: true,
        };

        // 使用目录最后一段作为安装名
        let install_name = Path::new(&skill.directory)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| skill.directory.clone());

        let dest = ssot_dir.join(&install_name);

        // 如果已存在则跳过下载
        if !dest.exists() {
            // 克隆仓库
            let temp_dir = self.clone_repo(&repo).await?;

            // 复制到 SSOT
            let source = temp_dir.join(&skill.directory);
            if !source.exists() {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(anyhow!(format_skill_error(
                    "SKILL_DIR_NOT_FOUND",
                    &[("path", &source.display().to_string())],
                    Some("checkRepoUrl"),
                )));
            }

            Self::copy_dir_recursive(&source, &dest)?;
            let _ = fs::remove_dir_all(&temp_dir);
        }

        let tree_commit_id = if let Some(tree_sha) = skill
            .tree_sha
            .clone()
            .filter(|value| !value.trim().is_empty())
        {
            Some(tree_sha)
        } else {
            self.resolve_tree_commit_id(&repo, &skill.directory, &install_name)
                .await
        };

        // 创建 InstalledSkill 记录
        let installed_skill = InstalledSkill {
            id: skill.key.clone(),
            name: skill.name.clone(),
            description: if skill.description.is_empty() {
                None
            } else {
                Some(skill.description.clone())
            },
            directory: install_name.clone(),
            repo_owner: Some(skill.repo_owner.clone()),
            repo_name: Some(skill.repo_name.clone()),
            repo_branch: Some(skill.repo_branch.clone()),
            readme_url: skill.readme_url.clone(),
            tree_commit_id,
            apps: SkillApps::only(current_app),
            installed_at: chrono::Utc::now().timestamp(),
        };

        // 保存到数据库
        db.save_skill(&installed_skill)?;

        // 同步到当前应用目录
        Self::sync_to_app_dir(&install_name, current_app)?;

        log::info!(
            "Skill {} 安装成功，已启用 {:?}",
            installed_skill.name,
            current_app
        );

        Ok(installed_skill)
    }

    /// 卸载 Skill
    ///
    /// 流程：
    /// 1. 从所有应用目录删除
    /// 2. 从 SSOT 删除
    /// 3. 从数据库删除
    pub fn uninstall(db: &Arc<Database>, id: &str) -> Result<()> {
        // 获取 skill 信息
        let skill = db
            .get_installed_skill(id)?
            .ok_or_else(|| anyhow!("Skill not found: {id}"))?;

        // 从所有应用目录删除
        for app in [
            AppType::Claude,
            AppType::Codex,
            AppType::Gemini,
            AppType::OpenCode,
            AppType::Cursor,
        ] {
            let _ = Self::remove_from_app(&skill.directory, &app);
        }

        // 从 SSOT 删除
        let ssot_dir = Self::get_ssot_dir()?;
        let skill_path = ssot_dir.join(&skill.directory);
        if skill_path.exists() {
            fs::remove_dir_all(&skill_path)?;
        }

        // 从数据库删除
        db.delete_skill(id)?;

        log::info!("Skill {} 卸载成功", skill.name);

        Ok(())
    }

    /// 切换应用启用状态
    ///
    /// 启用：复制到应用目录
    /// 禁用：从应用目录删除
    pub fn toggle_app(db: &Arc<Database>, id: &str, app: &AppType, enabled: bool) -> Result<()> {
        // 获取当前 skill
        let mut skill = db
            .get_installed_skill(id)?
            .ok_or_else(|| anyhow!("Skill not found: {id}"))?;

        // 更新状态
        skill.apps.set_enabled_for(app, enabled);

        // 同步文件
        if enabled {
            Self::sync_to_app_dir(&skill.directory, app)?;
        } else {
            Self::remove_from_app(&skill.directory, app)?;
        }

        // 更新数据库
        db.update_skill_apps(id, &skill.apps)?;

        log::info!("Skill {} 的 {:?} 状态已更新为 {}", skill.name, app, enabled);

        Ok(())
    }

    /// 扫描未管理的 Skills
    ///
    /// 扫描各应用目录，找出未被 CC Switch 管理的 Skills
    pub fn scan_unmanaged(db: &Arc<Database>) -> Result<Vec<UnmanagedSkill>> {
        let managed_skills = db.get_all_installed_skills()?;
        let managed_dirs: HashSet<String> = managed_skills
            .values()
            .map(|s| s.directory.clone())
            .collect();

        let mut unmanaged: HashMap<String, UnmanagedSkill> = HashMap::new();

        for app in [
            AppType::Claude,
            AppType::Codex,
            AppType::Gemini,
            AppType::OpenCode,
            AppType::Cursor,
        ] {
            let app_dir = match Self::get_app_skills_dir(&app) {
                Ok(d) => d,
                Err(_) => continue,
            };

            if !app_dir.exists() {
                continue;
            }

            for entry in fs::read_dir(&app_dir)? {
                let entry = entry?;
                let path = entry.path();

                if !path.is_dir() {
                    continue;
                }

                let dir_name = entry.file_name().to_string_lossy().to_string();

                // 跳过隐藏目录（以 . 开头，如 .system）
                if dir_name.starts_with('.') {
                    continue;
                }

                // 跳过已管理的
                if managed_dirs.contains(&dir_name) {
                    continue;
                }

                // 检查是否有 SKILL.md
                let skill_md = path.join("SKILL.md");
                let (name, description) = if skill_md.exists() {
                    match Self::parse_skill_metadata_static(&skill_md) {
                        Ok(meta) => (
                            meta.name.unwrap_or_else(|| dir_name.clone()),
                            meta.description,
                        ),
                        Err(_) => (dir_name.clone(), None),
                    }
                } else {
                    (dir_name.clone(), None)
                };

                // 添加或更新
                let app_str = match app {
                    AppType::Claude => "claude",
                    AppType::Codex => "codex",
                    AppType::Gemini => "gemini",
                    AppType::OpenCode => "opencode",
                    AppType::Cursor => "cursor",
                };

                unmanaged
                    .entry(dir_name.clone())
                    .and_modify(|s| s.found_in.push(app_str.to_string()))
                    .or_insert(UnmanagedSkill {
                        directory: dir_name,
                        name,
                        description,
                        found_in: vec![app_str.to_string()],
                    });
            }
        }

        let mut result: Vec<UnmanagedSkill> = unmanaged.into_values().collect();
        result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(result)
    }

    /// 从应用目录导入 Skills
    ///
    /// 将未管理的 Skills 导入到 CC Switch 统一管理
    pub fn import_from_apps(
        db: &Arc<Database>,
        directories: Vec<String>,
    ) -> Result<Vec<InstalledSkill>> {
        let ssot_dir = Self::get_ssot_dir()?;
        let mut imported = Vec::new();

        for dir_name in directories {
            // 找到源目录（从任一应用目录复制）
            let mut source_path: Option<PathBuf> = None;
            let mut found_in: Vec<String> = Vec::new();

            for app in [
                AppType::Claude,
                AppType::Codex,
                AppType::Gemini,
                AppType::OpenCode,
                AppType::Cursor,
            ] {
                if let Ok(app_dir) = Self::get_app_skills_dir(&app) {
                    let skill_path = app_dir.join(&dir_name);
                    if skill_path.exists() {
                        if source_path.is_none() {
                            source_path = Some(skill_path);
                        }
                        let app_str = match app {
                            AppType::Claude => "claude",
                            AppType::Codex => "codex",
                            AppType::Gemini => "gemini",
                            AppType::OpenCode => "opencode",
                            AppType::Cursor => "cursor",
                        };
                        found_in.push(app_str.to_string());
                    }
                }
            }

            let source = match source_path {
                Some(p) => p,
                None => continue,
            };

            // 复制到 SSOT
            let dest = ssot_dir.join(&dir_name);
            if !dest.exists() {
                Self::copy_dir_recursive(&source, &dest)?;
            }

            // 解析元数据
            let skill_md = dest.join("SKILL.md");
            let (name, description) = if skill_md.exists() {
                match Self::parse_skill_metadata_static(&skill_md) {
                    Ok(meta) => (
                        meta.name.unwrap_or_else(|| dir_name.clone()),
                        meta.description,
                    ),
                    Err(_) => (dir_name.clone(), None),
                }
            } else {
                (dir_name.clone(), None)
            };

            // 构建启用状态
            let mut apps = SkillApps::default();
            for app_str in &found_in {
                match app_str.as_str() {
                    "claude" => apps.claude = true,
                    "codex" => apps.codex = true,
                    "gemini" => apps.gemini = true,
                    "opencode" => apps.opencode = true,
                    "cursor" => apps.cursor = true,
                    _ => {}
                }
            }

            // 创建记录
            let skill = InstalledSkill {
                id: format!("local:{dir_name}"),
                name,
                description,
                directory: dir_name,
                repo_owner: None,
                repo_name: None,
                repo_branch: None,
                readme_url: None,
                tree_commit_id: None,
                apps,
                installed_at: chrono::Utc::now().timestamp(),
            };

            // 保存到数据库
            db.save_skill(&skill)?;

            // 同步到所有发现该 Skill 的应用目录（用 symlink 替换原始文件）
            for app_str in &found_in {
                let app = match app_str.as_str() {
                    "claude" => AppType::Claude,
                    "codex" => AppType::Codex,
                    "gemini" => AppType::Gemini,
                    "opencode" => AppType::OpenCode,
                    "cursor" => AppType::Cursor,
                    _ => continue,
                };
                if let Err(e) = Self::sync_to_app_dir(&skill.directory, &app) {
                    log::warn!("导入后同步到 {:?} 失败: {:#}", app, e);
                }
            }

            imported.push(skill);
        }

        log::info!("成功导入 {} 个 Skills", imported.len());

        Ok(imported)
    }

    // ========== 文件同步方法 ==========

    /// 创建符号链接（跨平台）
    ///
    /// - Unix: 使用 std::os::unix::fs::symlink
    /// - Windows: 使用 std::os::windows::fs::symlink_dir
    #[cfg(unix)]
    fn create_symlink(src: &Path, dest: &Path) -> Result<()> {
        std::os::unix::fs::symlink(src, dest)
            .with_context(|| format!("创建符号链接失败: {} -> {}", src.display(), dest.display()))
    }

    #[cfg(windows)]
    fn create_symlink(src: &Path, dest: &Path) -> Result<()> {
        std::os::windows::fs::symlink_dir(src, dest)
            .with_context(|| format!("创建符号链接失败: {} -> {}", src.display(), dest.display()))
    }

    /// 检查路径是否为符号链接
    fn is_symlink(path: &Path) -> bool {
        path.symlink_metadata()
            .map(|m| m.file_type().is_symlink())
            .unwrap_or(false)
    }

    /// 获取当前同步方式配置
    fn get_sync_method() -> SyncMethod {
        crate::cc_switch::settings::get_skill_sync_method()
    }

    /// 同步 Skill 到应用目录（使用 symlink 或 copy）
    ///
    /// 根据配置和平台选择最佳同步方式：
    /// - Auto: 优先尝试 symlink，失败时回退到 copy
    /// - Symlink: 仅使用 symlink
    /// - Copy: 仅使用文件复制
    pub fn sync_to_app_dir(directory: &str, app: &AppType) -> Result<()> {
        let ssot_dir = Self::get_ssot_dir()?;
        let source = ssot_dir.join(directory);

        if !source.exists() {
            return Err(anyhow!("Skill 不存在于 SSOT: {directory}"));
        }

        let app_dir = Self::get_app_skills_dir(app)?;
        fs::create_dir_all(&app_dir)?;

        let dest = app_dir.join(directory);

        // 如果已存在则先删除（无论是 symlink 还是真实目录）
        if dest.exists() || Self::is_symlink(&dest) {
            Self::remove_path(&dest)?;
        }

        let sync_method = Self::get_sync_method();

        match sync_method {
            SyncMethod::Auto => {
                // 优先尝试 symlink
                match Self::create_symlink(&source, &dest) {
                    Ok(()) => {
                        log::debug!("Skill {directory} 已通过 symlink 同步到 {app:?}");
                        return Ok(());
                    }
                    Err(err) => {
                        log::warn!(
                            "Symlink 创建失败，将回退到文件复制: {} -> {}. 错误: {err:#}",
                            source.display(),
                            dest.display()
                        );
                    }
                }
                // Fallback 到 copy
                Self::copy_dir_recursive(&source, &dest)?;
                log::debug!("Skill {directory} 已通过复制同步到 {app:?}");
            }
            SyncMethod::Symlink => {
                Self::create_symlink(&source, &dest)?;
                log::debug!("Skill {directory} 已通过 symlink 同步到 {app:?}");
            }
            SyncMethod::Copy => {
                Self::copy_dir_recursive(&source, &dest)?;
                log::debug!("Skill {directory} 已通过复制同步到 {app:?}");
            }
        }

        Ok(())
    }

    /// 复制 Skill 到应用目录（保留用于向后兼容）
    #[deprecated(note = "请使用 sync_to_app_dir() 代替")]
    pub fn copy_to_app(directory: &str, app: &AppType) -> Result<()> {
        Self::sync_to_app_dir(directory, app)
    }

    /// 删除路径（支持 symlink 和真实目录）
    fn remove_path(path: &Path) -> Result<()> {
        if Self::is_symlink(path) {
            // 符号链接：仅删除链接本身，不影响源文件
            #[cfg(unix)]
            fs::remove_file(path)?;
            #[cfg(windows)]
            fs::remove_dir(path)?; // Windows 的目录 symlink 需要用 remove_dir
        } else if path.is_dir() {
            // 真实目录：递归删除
            fs::remove_dir_all(path)?;
        } else if path.exists() {
            // 普通文件
            fs::remove_file(path)?;
        }
        Ok(())
    }

    /// 从应用目录删除 Skill（支持 symlink 和真实目录）
    pub fn remove_from_app(directory: &str, app: &AppType) -> Result<()> {
        let app_dir = Self::get_app_skills_dir(app)?;
        let skill_path = app_dir.join(directory);

        if skill_path.exists() || Self::is_symlink(&skill_path) {
            Self::remove_path(&skill_path)?;
            log::debug!("Skill {directory} 已从 {app:?} 删除");
        }

        Ok(())
    }

    /// 同步所有已启用的 Skills 到指定应用
    pub fn sync_to_app(db: &Arc<Database>, app: &AppType) -> Result<()> {
        let skills = db.get_all_installed_skills()?;

        for skill in skills.values() {
            if skill.apps.is_enabled_for(app) {
                Self::sync_to_app_dir(&skill.directory, app)?;
            }
        }

        Ok(())
    }

    // ========== 发现功能（保留原有逻辑）==========

    /// 列出所有可发现的技能（从仓库获取，支持缓存）
    pub async fn discover_available(
        &self,
        repos: Vec<SkillRepo>,
        db: &Arc<Database>,
    ) -> Result<Vec<DiscoverableSkill>> {
        let mut skills = Vec::new();

        // 仅使用启用的仓库
        let enabled_repos: Vec<SkillRepo> = repos.into_iter().filter(|repo| repo.enabled).collect();

        let fetch_tasks = enabled_repos
            .iter()
            .map(|repo| self.fetch_repo_skills_cached(repo, db));

        let results: Vec<Result<Vec<DiscoverableSkill>>> =
            futures::future::join_all(fetch_tasks).await;

        for (repo, result) in enabled_repos.into_iter().zip(results.into_iter()) {
            match result {
                Ok(repo_skills) => skills.extend(repo_skills),
                Err(e) => log::warn!("获取仓库 {}/{} 技能失败: {}", repo.owner, repo.name, e),
            }
        }

        // 去重并排序
        Self::deduplicate_discoverable_skills(&mut skills);
        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(skills)
    }

    /// 列出所有技能（兼容旧 API）
    pub async fn list_skills(
        &self,
        repos: Vec<SkillRepo>,
        db: &Arc<Database>,
    ) -> Result<Vec<Skill>> {
        // 获取可发现的技能
        let discoverable = self.discover_available(repos, db).await?;

        // 获取已安装的技能
        let installed = db.get_all_installed_skills()?;
        let installed_dirs: HashSet<String> =
            installed.values().map(|s| s.directory.clone()).collect();

        // 转换为 Skill 格式
        let mut skills: Vec<Skill> = discoverable
            .into_iter()
            .map(|d| {
                let install_name = Path::new(&d.directory)
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| d.directory.clone());

                Skill {
                    key: d.key,
                    name: d.name,
                    description: d.description,
                    directory: d.directory,
                    readme_url: d.readme_url,
                    installed: installed_dirs.contains(&install_name),
                    repo_owner: Some(d.repo_owner),
                    repo_name: Some(d.repo_name),
                    repo_branch: Some(d.repo_branch),
                }
            })
            .collect();

        // 添加本地已安装但不在仓库中的技能
        for skill in installed.values() {
            let already_in_list = skills.iter().any(|s| {
                let s_install_name = Path::new(&s.directory)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| s.directory.clone());
                s_install_name == skill.directory
            });

            if !already_in_list {
                skills.push(Skill {
                    key: skill.id.clone(),
                    name: skill.name.clone(),
                    description: skill.description.clone().unwrap_or_default(),
                    directory: skill.directory.clone(),
                    readme_url: skill.readme_url.clone(),
                    installed: true,
                    repo_owner: skill.repo_owner.clone(),
                    repo_name: skill.repo_name.clone(),
                    repo_branch: skill.repo_branch.clone(),
                });
            }
        }

        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(skills)
    }

    /// 通过 GitHub Trees API 获取仓库目录树
    ///
    /// 对齐 vercel-labs/skills: 一次 API 调用获取全仓库目录树。
    /// 先尝试指定分支，失败后依次尝试 main/master。
    async fn fetch_github_tree(
        &self,
        owner: &str,
        repo: &str,
        branch: &str,
    ) -> Result<GitHubTreeResponse> {
        let client = crate::cc_switch::proxy::http_client::get();
        let branches = if branch.is_empty() {
            vec!["main", "master"]
        } else {
            vec![branch, "main", "master"]
        };

        let mut last_error = None;
        for b in &branches {
            let url = format!(
                "https://api.github.com/repos/{}/{}/git/trees/{}?recursive=1",
                owner, repo, b
            );

            let resp = client
                .get(&url)
                .header("Accept", "application/vnd.github.v3+json")
                .header("User-Agent", "mnemosyne-skill-manager")
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    let tree: GitHubTreeResponse = r.json().await?;
                    return Ok(tree);
                }
                Ok(r) => {
                    last_error = Some(anyhow!(
                        "GitHub Trees API 返回 {} (branch: {})",
                        r.status(),
                        b
                    ));
                }
                Err(e) => {
                    last_error = Some(anyhow!("GitHub Trees API 请求失败: {}", e));
                }
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow!("所有分支的 Trees API 调用失败")))
    }

    /// 解析指定技能目录的 tree SHA（安装时兜底）
    async fn resolve_tree_commit_id(
        &self,
        repo: &SkillRepo,
        skill_directory: &str,
        install_name: &str,
    ) -> Option<String> {
        let tree = match self
            .fetch_github_tree(&repo.owner, &repo.name, &repo.branch)
            .await
        {
            Ok(tree) => tree,
            Err(error) => {
                log::debug!(
                    "解析技能 tree commit 失败（{}/{}:{}）: {}",
                    repo.owner,
                    repo.name,
                    skill_directory,
                    error
                );
                return None;
            }
        };

        let normalized_directory = skill_directory.trim().trim_matches('/').to_lowercase();
        let normalized_install_name = install_name.trim().trim_matches('/').to_lowercase();
        let skill_dirs = Self::extract_skill_dirs_from_tree(&tree);

        skill_dirs.into_iter().find_map(|(dir, sha)| {
            if sha.trim().is_empty() {
                return None;
            }

            let normalized_dir = dir.trim().trim_matches('/').to_lowercase();
            if normalized_dir == normalized_directory
                || normalized_dir.ends_with(&format!("/{normalized_install_name}"))
                || (!normalized_install_name.is_empty()
                    && normalized_dir == normalized_install_name)
            {
                return Some(sha);
            }
            None
        })
    }

    /// 带缓存的仓库技能获取（对齐 vercel-labs/skills 的 check/update 模式）
    ///
    /// 流程：
    /// 1. 调用 GitHub Trees API 获取最新仓库目录树
    /// 2. 比对 root_tree_sha：相同则直接返回缓存
    /// 3. 不同则逐个比对 skill 目录的 tree_sha，仅更新变更部分
    /// 4. Trees API 失败时降级为 git clone 全量克隆
    async fn fetch_repo_skills_cached(
        &self,
        repo: &SkillRepo,
        db: &Arc<Database>,
    ) -> Result<Vec<DiscoverableSkill>> {
        // 尝试 Trees API 缓存路径
        match self.try_cached_fetch(repo, db).await {
            Ok(skills) => return Ok(skills),
            Err(e) => {
                log::debug!(
                    "Trees API 缓存路径失败 ({}/{}): {}, 降级为 git clone",
                    repo.owner, repo.name, e
                );
            }
        }

        // 降级：git clone 全量克隆
        let skills = self.fetch_repo_skills(repo).await?;

        // 异步保存缓存（不阻塞返回）
        self.save_skills_to_cache(repo, &skills, db);

        Ok(skills)
    }

    /// 尝试通过 Trees API + 缓存获取技能
    async fn try_cached_fetch(
        &self,
        repo: &SkillRepo,
        db: &Arc<Database>,
    ) -> Result<Vec<DiscoverableSkill>> {
        // 1. 获取最新 tree
        let tree_resp = self
            .fetch_github_tree(&repo.owner, &repo.name, &repo.branch)
            .await?;

        let now = chrono::Utc::now().timestamp();

        // 2. 检查 repo_tree_cache
        let cached_tree = db.get_repo_tree_cache(&repo.owner, &repo.name)?;

        if let Some(ref ct) = cached_tree {
            if ct.root_tree_sha == tree_resp.sha {
                // root SHA 相同 → 仓库无变更，直接返回缓存
                log::info!(
                    "仓库 {}/{} Tree SHA 未变更，使用缓存",
                    repo.owner, repo.name
                );
                let cached_skills = db.get_skill_caches_by_repo(&repo.owner, &repo.name)?;
                if !cached_skills.is_empty() {
                    let skills: Vec<DiscoverableSkill> = cached_skills
                        .iter()
                        .filter_map(|c| {
                            let mut skill: DiscoverableSkill =
                                serde_json::from_str(&c.cached_data).ok()?;
                            if skill.tree_sha.is_none() && !c.tree_sha.is_empty() {
                                skill.tree_sha = Some(c.tree_sha.clone());
                            }
                            Some(skill)
                        })
                        .collect();
                    if !skills.is_empty() {
                        return Ok(skills);
                    }
                }
            }
        }

        // 3. Tree SHA 不同或无缓存 → 需要更新
        // 从 tree 中提取包含 SKILL.md 的目录
        let skill_dirs = Self::extract_skill_dirs_from_tree(&tree_resp);

        if skill_dirs.is_empty() {
            return Err(anyhow!("仓库中未找到 SKILL.md"));
        }

        // 4. 比对每个 skill 目录的 tree_sha
        let cached_skills = db.get_skill_caches_by_repo(&repo.owner, &repo.name)?;
        let cached_map: HashMap<String, SkillCacheRow> = cached_skills
            .into_iter()
            .map(|c| (c.skill_directory.clone(), c))
            .collect();

        let mut needs_clone = false;
        let mut result_skills: Vec<DiscoverableSkill> = Vec::new();
        let mut updated_dirs: Vec<String> = Vec::new();

        for (dir, sha) in &skill_dirs {
            if let Some(cached) = cached_map.get(dir.as_str()) {
                if cached.tree_sha == *sha {
                    // SHA 相同 → 使用缓存
                    if let Ok(skill) = serde_json::from_str::<DiscoverableSkill>(&cached.cached_data)
                    {
                        let mut skill = skill;
                        if skill.tree_sha.is_none() && !cached.tree_sha.is_empty() {
                            skill.tree_sha = Some(cached.tree_sha.clone());
                        }
                        result_skills.push(skill);
                        continue;
                    }
                }
            }
            // SHA 不同或无缓存 → 需要克隆
            needs_clone = true;
            updated_dirs.push(dir.clone());
        }

        if !needs_clone {
            // 所有 skill 都命中缓存
            self.update_repo_tree_cache(repo, &tree_resp, &skill_dirs, db, now);
            return Ok(result_skills);
        }

        // 5. 有变更 → git clone 获取最新内容
        let temp_dir = self.clone_repo(repo).await?;
        let mut cloned_skills = Vec::new();
        self.scan_dir_recursive(&temp_dir, &temp_dir, repo, &mut cloned_skills)?;
        let _ = Self::cleanup_temp_dir(&temp_dir);

        // 6. 合并：缓存命中的 + 新克隆的
        let cloned_map: HashMap<String, DiscoverableSkill> = cloned_skills
            .into_iter()
            .map(|s| (s.directory.clone(), s))
            .collect();

        // 用克隆结果替换需要更新的
        let mut final_skills: Vec<DiscoverableSkill> = Vec::new();
        for (dir, sha) in &skill_dirs {
            if updated_dirs.contains(dir) {
                if let Some(skill) = cloned_map.get(dir.as_str()) {
                    let mut skill_with_sha = skill.clone();
                    skill_with_sha.tree_sha = Some(sha.clone());
                    final_skills.push(skill_with_sha.clone());
                    // 更新缓存
                    self.save_single_skill_cache(repo, dir, sha, &skill_with_sha, db, now);
                }
            } else if let Some(cached) = cached_map.get(dir.as_str()) {
                if let Ok(skill) = serde_json::from_str::<DiscoverableSkill>(&cached.cached_data) {
                    let mut skill = skill;
                    if skill.tree_sha.is_none() && !cached.tree_sha.is_empty() {
                        skill.tree_sha = Some(cached.tree_sha.clone());
                    }
                    final_skills.push(skill);
                }
            }
        }

        // 也保存克隆中发现但 tree 中未匹配的 skill
        for (dir, skill) in &cloned_map {
            if !skill_dirs.iter().any(|(d, _)| d == dir) {
                final_skills.push(skill.clone());
            }
        }

        // 7. 更新 repo_tree_cache
        self.update_repo_tree_cache(repo, &tree_resp, &skill_dirs, db, now);

        Ok(final_skills)
    }

    /// 从 GitHub Tree 响应中提取包含 SKILL.md 的目录及其父目录 SHA
    fn extract_skill_dirs_from_tree(tree: &GitHubTreeResponse) -> Vec<(String, String)> {
        // 找到所有 SKILL.md 文件
        let skill_md_paths: Vec<&str> = tree
            .tree
            .iter()
            .filter(|e| e.entry_type == "blob" && e.path.ends_with("SKILL.md"))
            .map(|e| e.path.as_str())
            .collect();

        // 构建目录 → SHA 映射
        let dir_sha_map: HashMap<&str, &str> = tree
            .tree
            .iter()
            .filter(|e| e.entry_type == "tree")
            .map(|e| (e.path.as_str(), e.sha.as_str()))
            .collect();

        let mut result = Vec::new();
        for md_path in skill_md_paths {
            // "skills/foo/SKILL.md" → "skills/foo"
            if let Some(dir) = md_path.strip_suffix("/SKILL.md") {
                let sha = dir_sha_map
                    .get(dir)
                    .copied()
                    .unwrap_or("unknown");
                result.push((dir.to_string(), sha.to_string()));
            } else if md_path == "SKILL.md" {
                // 根目录的 SKILL.md
                result.push(("".to_string(), tree.sha.clone()));
            }
        }

        result
    }

    /// 保存单个 skill 缓存
    fn save_single_skill_cache(
        &self,
        repo: &SkillRepo,
        dir: &str,
        sha: &str,
        skill: &DiscoverableSkill,
        db: &Arc<Database>,
        now: i64,
    ) {
        let cache_key = format!("{}/{}:{}", repo.owner, repo.name, dir);
        let cached_data = match serde_json::to_string(skill) {
            Ok(d) => d,
            Err(e) => {
                log::warn!("序列化 skill 缓存失败: {}", e);
                return;
            }
        };

        let row = SkillCacheRow {
            cache_key,
            repo_owner: repo.owner.clone(),
            repo_name: repo.name.clone(),
            repo_branch: repo.branch.clone(),
            skill_directory: dir.to_string(),
            tree_sha: sha.to_string(),
            cached_data,
            cached_at: now,
            last_checked_at: now,
        };

        if let Err(e) = db.save_skill_cache(&row) {
            log::warn!("保存 skill 缓存失败: {}", e);
        }
    }

    /// 更新 repo_tree_cache
    fn update_repo_tree_cache(
        &self,
        repo: &SkillRepo,
        tree_resp: &GitHubTreeResponse,
        skill_dirs: &[(String, String)],
        db: &Arc<Database>,
        now: i64,
    ) {
        let tree_data = match serde_json::to_string(skill_dirs) {
            Ok(d) => d,
            Err(e) => {
                log::warn!("序列化 tree_data 失败: {}", e);
                return;
            }
        };

        let row = RepoTreeCacheRow {
            repo_key: format!("{}/{}", repo.owner, repo.name),
            repo_owner: repo.owner.clone(),
            repo_name: repo.name.clone(),
            repo_branch: repo.branch.clone(),
            root_tree_sha: tree_resp.sha.clone(),
            tree_data,
            cached_at: now,
        };

        if let Err(e) = db.save_repo_tree_cache(&row) {
            log::warn!("保存 repo_tree_cache 失败: {}", e);
        }
    }

    /// 将全量克隆结果保存到缓存
    fn save_skills_to_cache(
        &self,
        repo: &SkillRepo,
        skills: &[DiscoverableSkill],
        db: &Arc<Database>,
    ) {
        let now = chrono::Utc::now().timestamp();
        for skill in skills {
            let cache_key = format!("{}/{}:{}", repo.owner, repo.name, skill.directory);
            let cached_data = match serde_json::to_string(skill) {
                Ok(d) => d,
                Err(_) => continue,
            };

            let row = SkillCacheRow {
                cache_key,
                repo_owner: repo.owner.clone(),
                repo_name: repo.name.clone(),
                repo_branch: repo.branch.clone(),
                skill_directory: skill.directory.clone(),
                tree_sha: skill.tree_sha.clone().unwrap_or_default(), // 降级路径通常无 tree SHA
                cached_data,
                cached_at: now,
                last_checked_at: now,
            };

            if let Err(e) = db.save_skill_cache(&row) {
                log::warn!("保存 skill 缓存失败: {}", e);
            }
        }
    }

    /// 从仓库获取技能列表（无缓存，直接 git clone）
    async fn fetch_repo_skills(&self, repo: &SkillRepo) -> Result<Vec<DiscoverableSkill>> {
        let temp_dir = self.clone_repo(repo).await?;

        let mut skills = Vec::new();
        let scan_dir = temp_dir.clone();

        self.scan_dir_recursive(&scan_dir, &scan_dir, repo, &mut skills)?;

        let _ = Self::cleanup_temp_dir(&temp_dir);

        Ok(skills)
    }

    /// 递归扫描目录查找 SKILL.md
    fn scan_dir_recursive(
        &self,
        current_dir: &Path,
        base_dir: &Path,
        repo: &SkillRepo,
        skills: &mut Vec<DiscoverableSkill>,
    ) -> Result<()> {
        let skill_md = current_dir.join("SKILL.md");

        if skill_md.exists() {
            let directory = if current_dir == base_dir {
                repo.name.clone()
            } else {
                current_dir
                    .strip_prefix(base_dir)
                    .unwrap_or(current_dir)
                    .to_string_lossy()
                    .to_string()
            };

            if let Ok(skill) = self.build_skill_from_metadata(&skill_md, &directory, repo) {
                skills.push(skill);
            }

            return Ok(());
        }

        for entry in fs::read_dir(current_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.scan_dir_recursive(&path, base_dir, repo, skills)?;
            }
        }

        Ok(())
    }

    /// 从 SKILL.md 构建技能对象
    fn build_skill_from_metadata(
        &self,
        skill_md: &Path,
        directory: &str,
        repo: &SkillRepo,
    ) -> Result<DiscoverableSkill> {
        let meta = self.parse_skill_metadata(skill_md)?;

        Ok(DiscoverableSkill {
            key: format!("{}/{}:{}", repo.owner, repo.name, directory),
            name: meta.name.unwrap_or_else(|| directory.to_string()),
            description: meta.description.unwrap_or_default(),
            directory: directory.to_string(),
            readme_url: Some(format!(
                "https://github.com/{}/{}/tree/{}/{}",
                repo.owner, repo.name, repo.branch, directory
            )),
            repo_owner: repo.owner.clone(),
            repo_name: repo.name.clone(),
            repo_branch: repo.branch.clone(),
            tree_sha: None,
        })
    }

    /// 解析技能元数据
    fn parse_skill_metadata(&self, path: &Path) -> Result<SkillMetadata> {
        Self::parse_skill_metadata_static(path)
    }

    /// 静态方法：解析技能元数据
    fn parse_skill_metadata_static(path: &Path) -> Result<SkillMetadata> {
        let content = fs::read_to_string(path)?;
        let content = content.trim_start_matches('\u{feff}');

        let parts: Vec<&str> = content.splitn(3, "---").collect();
        if parts.len() < 3 {
            return Ok(SkillMetadata {
                name: None,
                description: None,
            });
        }

        let front_matter = parts[1].trim();
        let meta: SkillMetadata = serde_yaml::from_str(front_matter).unwrap_or(SkillMetadata {
            name: None,
            description: None,
        });

        Ok(meta)
    }

    /// 去重技能列表
    fn deduplicate_discoverable_skills(skills: &mut Vec<DiscoverableSkill>) {
        let mut seen = HashMap::new();
        skills.retain(|skill| {
            let unique_key = skill.key.to_lowercase();
            if let std::collections::hash_map::Entry::Vacant(e) = seen.entry(unique_key) {
                e.insert(true);
                true
            } else {
                false
            }
        });
    }

    /// 浅克隆仓库到临时目录（对齐 vercel-labs/skills 的 cloneRepo）
    ///
    /// 使用 `git clone --depth 1 --branch {branch}` 仅获取最新提交。
    /// 尝试顺序：指定分支 → main → master
    async fn clone_repo(&self, repo: &SkillRepo) -> Result<PathBuf> {
        let temp_dir = tempfile::tempdir()?;
        let temp_path = temp_dir.path().to_path_buf();
        let _ = temp_dir.keep(); // 保留临时目录，由调用方负责清理

        let url = format!("https://github.com/{}/{}.git", repo.owner, repo.name);
        let branches = if repo.branch.is_empty() {
            vec!["main", "master"]
        } else {
            vec![repo.branch.as_str(), "main", "master"]
        };

        let mut last_error = None;
        for branch in &branches {
            match timeout(
                Duration::from_secs(CLONE_TIMEOUT_SECS),
                Self::execute_git_clone(&url, branch, &temp_path),
            )
            .await
            {
                Ok(Ok(_)) => return Ok(temp_path),
                Ok(Err(e)) => {
                    last_error = Some(e);
                    continue;
                }
                Err(_) => {
                    last_error = Some(anyhow!(format_skill_error(
                        "CLONE_TIMEOUT",
                        &[("url", &url), ("branch", branch), ("timeout", "60")],
                        Some("checkNetwork"),
                    )));
                    continue;
                }
            }
        }

        // 所有分支都失败，清理临时目录
        let _ = Self::cleanup_temp_dir(&temp_path);
        Err(last_error.unwrap_or_else(|| anyhow!("所有分支克隆失败")))
    }

    /// 执行 git clone 命令
    async fn execute_git_clone(url: &str, branch: &str, dest: &Path) -> Result<()> {
        let output = tokio::process::Command::new("git")
            .args(["clone", "--depth", "1", "--branch", branch, url])
            .arg(dest)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // 对齐 vercel-labs/skills 的错误分类
            if stderr.contains("Authentication failed")
                || stderr.contains("could not read Username")
                || stderr.contains("Permission denied")
                || stderr.contains("Repository not found")
            {
                return Err(anyhow!(format_skill_error(
                    "CLONE_AUTH_ERROR",
                    &[("url", url)],
                    Some("checkAuth"),
                )));
            }
            return Err(anyhow!("git clone failed: {}", stderr));
        }
        Ok(())
    }

    /// 安全清理临时目录（对齐 vercel-labs/skills 的路径遍历防护）
    fn cleanup_temp_dir(dir: &Path) -> Result<()> {
        let normalized_dir = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
        let temp_dir = std::env::temp_dir();
        let normalized_temp = temp_dir.canonicalize().unwrap_or(temp_dir);

        if !normalized_dir.starts_with(&normalized_temp) {
            return Err(anyhow!(
                "拒绝清理临时目录之外的路径: {}",
                dir.display()
            ));
        }

        fs::remove_dir_all(dir).ok();
        Ok(())
    }

    /// 递归复制目录
    fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<()> {
        fs::create_dir_all(dest)?;

        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let path = entry.path();
            let dest_path = dest.join(entry.file_name());

            if path.is_dir() {
                Self::copy_dir_recursive(&path, &dest_path)?;
            } else {
                fs::copy(&path, &dest_path)?;
            }
        }

        Ok(())
    }

    // ========== 仓库管理（保留原有逻辑）==========

    /// 列出仓库
    pub fn list_repos(&self, store: &SkillStore) -> Vec<SkillRepo> {
        store.repos.clone()
    }

    /// 添加仓库
    pub fn add_repo(&self, store: &mut SkillStore, repo: SkillRepo) -> Result<()> {
        if let Some(pos) = store
            .repos
            .iter()
            .position(|r| r.owner == repo.owner && r.name == repo.name)
        {
            store.repos[pos] = repo;
        } else {
            store.repos.push(repo);
        }

        Ok(())
    }

    /// 删除仓库
    pub fn remove_repo(&self, store: &mut SkillStore, owner: String, name: String) -> Result<()> {
        store
            .repos
            .retain(|r| !(r.owner == owner && r.name == name));

        Ok(())
    }

    // ========== 缓存管理 ==========

    /// 检查技能更新（仅调用 Trees API，不克隆仓库）
    ///
    /// 对齐 vercel-labs/skills 的 `cli.ts → runCheck()`
    pub async fn check_updates(
        &self,
        repos: Vec<SkillRepo>,
        db: &Arc<Database>,
    ) -> Result<Vec<SkillUpdateInfo>> {
        let enabled_repos: Vec<SkillRepo> =
            repos.into_iter().filter(|r| r.enabled).collect();
        let mut updates = Vec::new();

        for repo in &enabled_repos {
            match self.check_repo_updates(repo, db).await {
                Ok(Some(info)) => updates.push(info),
                Ok(None) => {} // 无更新
                Err(e) => {
                    log::warn!(
                        "检查仓库 {}/{} 更新失败: {}",
                        repo.owner, repo.name, e
                    );
                }
            }
        }

        Ok(updates)
    }

    /// 检查单个仓库的更新
    async fn check_repo_updates(
        &self,
        repo: &SkillRepo,
        db: &Arc<Database>,
    ) -> Result<Option<SkillUpdateInfo>> {
        let tree_resp = self
            .fetch_github_tree(&repo.owner, &repo.name, &repo.branch)
            .await?;

        // 比对 root_tree_sha
        let cached_tree = db.get_repo_tree_cache(&repo.owner, &repo.name)?;
        if let Some(ct) = cached_tree {
            if ct.root_tree_sha == tree_resp.sha {
                return Ok(None); // 无变更
            }
        }

        // 有变更，分析具体差异
        let new_dirs = Self::extract_skill_dirs_from_tree(&tree_resp);
        let cached_skills = db.get_skill_caches_by_repo(&repo.owner, &repo.name)?;
        let cached_map: HashMap<String, SkillCacheRow> = cached_skills
            .into_iter()
            .map(|c| (c.skill_directory.clone(), c))
            .collect();

        let mut updated = Vec::new();
        let mut new_skills = Vec::new();
        let mut removed = Vec::new();

        // 检查新增和更新
        for (dir, sha) in &new_dirs {
            match cached_map.get(dir.as_str()) {
                Some(cached) if cached.tree_sha != *sha => {
                    updated.push(dir.clone());
                }
                None => {
                    new_skills.push(dir.clone());
                }
                _ => {} // 未变更
            }
        }

        // 检查删除
        let new_dir_set: HashSet<&str> =
            new_dirs.iter().map(|(d, _)| d.as_str()).collect();
        for dir in cached_map.keys() {
            if !new_dir_set.contains(dir.as_str()) {
                removed.push(dir.clone());
            }
        }

        if updated.is_empty() && new_skills.is_empty() && removed.is_empty() {
            return Ok(None);
        }

        Ok(Some(SkillUpdateInfo {
            repo_owner: repo.owner.clone(),
            repo_name: repo.name.clone(),
            updated_skills: updated,
            new_skills,
            removed_skills: removed,
        }))
    }

    /// 清空所有技能缓存
    pub fn clear_cache(db: &Arc<Database>) -> Result<()> {
        db.clear_all_skill_cache()?;
        log::info!("已清空所有技能缓存");
        Ok(())
    }

    /// 刷新单个已安装技能的远程元数据
    pub async fn refresh_single_installed_from_remote(
        &self,
        db: &Arc<Database>,
        skill_id: &str,
    ) -> Result<SkillSingleRemoteRefreshResult> {
        let mut installed_skill = db
            .get_installed_skill(skill_id)?
            .ok_or_else(|| anyhow!("Skill not found: {skill_id}"))?;

        let (Some(repo_owner), Some(repo_name)) =
            (installed_skill.repo_owner.clone(), installed_skill.repo_name.clone())
        else {
            return Ok(SkillSingleRemoteRefreshResult {
                skill_id: installed_skill.id,
                updated: false,
                matched_remote: false,
                tree_commit_id: installed_skill.tree_commit_id,
            });
        };

        let repo_branch = installed_skill
            .repo_branch
            .clone()
            .unwrap_or_else(|| "main".to_string());
        let repo = SkillRepo {
            owner: repo_owner.clone(),
            name: repo_name.clone(),
            branch: repo_branch,
            enabled: true,
        };

        let discoverable_skills = self.fetch_repo_skills_cached(&repo, db).await?;
        let install_name = installed_skill.directory.to_lowercase();
        let remote_dir_hint = installed_skill
            .id
            .split_once(':')
            .and_then(|(prefix, remote_dir)| {
                if prefix.eq_ignore_ascii_case("local") {
                    None
                } else {
                    Some(remote_dir.trim().to_lowercase())
                }
            })
            .filter(|value| !value.is_empty());

        let matched_remote_skill = remote_dir_hint
            .as_ref()
            .and_then(|remote_dir| {
                discoverable_skills
                    .iter()
                    .find(|skill| skill.directory.to_lowercase() == *remote_dir)
            })
            .or_else(|| {
                discoverable_skills.iter().find(|skill| {
                    Path::new(&skill.directory)
                        .file_name()
                        .map(|segment| segment.to_string_lossy().to_lowercase())
                        .unwrap_or_else(|| skill.directory.to_lowercase())
                        == install_name
                })
            });

        let mut changed = false;
        let mut matched_remote = false;

        if let Some(remote_skill) = matched_remote_skill {
            matched_remote = true;

            let remote_description = if remote_skill.description.trim().is_empty() {
                None
            } else {
                Some(remote_skill.description.clone())
            };

            let remote_directory_for_resolve = remote_dir_hint
                .clone()
                .unwrap_or_else(|| remote_skill.directory.clone());

            let remote_tree_commit = if let Some(tree_sha) = remote_skill
                .tree_sha
                .clone()
                .filter(|value| !value.trim().is_empty())
            {
                Some(tree_sha)
            } else {
                self.resolve_tree_commit_id(
                    &repo,
                    &remote_directory_for_resolve,
                    &installed_skill.directory,
                )
                .await
            };

            if installed_skill.name != remote_skill.name {
                installed_skill.name = remote_skill.name.clone();
                changed = true;
            }
            if installed_skill.description != remote_description {
                installed_skill.description = remote_description;
                changed = true;
            }
            if installed_skill.repo_branch.as_deref() != Some(remote_skill.repo_branch.as_str()) {
                installed_skill.repo_branch = Some(remote_skill.repo_branch.clone());
                changed = true;
            }
            if installed_skill.readme_url != remote_skill.readme_url {
                installed_skill.readme_url = remote_skill.readme_url.clone();
                changed = true;
            }
            if let Some(tree_commit_id) = remote_tree_commit {
                if installed_skill.tree_commit_id.as_deref() != Some(tree_commit_id.as_str()) {
                    installed_skill.tree_commit_id = Some(tree_commit_id);
                    changed = true;
                }
            }
        } else {
            let remote_directory_for_resolve = remote_dir_hint
                .clone()
                .unwrap_or_else(|| installed_skill.directory.clone());
            let resolved_tree_commit = self
                .resolve_tree_commit_id(&repo, &remote_directory_for_resolve, &installed_skill.directory)
                .await;
            if let Some(tree_commit_id) = resolved_tree_commit {
                if installed_skill.tree_commit_id.as_deref() != Some(tree_commit_id.as_str()) {
                    installed_skill.tree_commit_id = Some(tree_commit_id);
                    changed = true;
                }
            }
        }

        if changed {
            db.save_skill(&installed_skill)?;
        }

        Ok(SkillSingleRemoteRefreshResult {
            skill_id: installed_skill.id,
            updated: changed,
            matched_remote,
            tree_commit_id: installed_skill.tree_commit_id,
        })
    }

    /// 刷新已安装技能的远程元数据（名称/描述/README/tree commit id）
    ///
    /// 用于“技能管理 -> 刷新列表”：
    /// 1. 仅针对“已安装且有 repo 信息”的技能
    /// 2. 重新解析远程仓库（走 Trees API + 缓存）
    /// 3. 回写数据库并返回更新统计
    pub async fn refresh_installed_from_remote(
        &self,
        db: &Arc<Database>,
    ) -> Result<SkillRemoteRefreshResult> {
        let installed_map = db.get_all_installed_skills()?;
        let mut installed: Vec<InstalledSkill> = installed_map.into_values().collect();

        if installed.is_empty() {
            return Ok(SkillRemoteRefreshResult {
                checked_repos: 0,
                scanned_skills: 0,
                updated_skills: 0,
            });
        }

        // 1. 去重后收集需要刷新的仓库集合
        let mut repos_by_key: HashMap<String, SkillRepo> = HashMap::new();
        for skill in &installed {
            let (Some(repo_owner), Some(repo_name)) = (&skill.repo_owner, &skill.repo_name) else {
                continue;
            };

            let repo_branch = skill
                .repo_branch
                .clone()
                .unwrap_or_else(|| "main".to_string());
            let repo_key = format!(
                "{}/{}/{}",
                repo_owner.to_lowercase(),
                repo_name.to_lowercase(),
                repo_branch.to_lowercase()
            );

            repos_by_key.entry(repo_key).or_insert(SkillRepo {
                owner: repo_owner.clone(),
                name: repo_name.clone(),
                branch: repo_branch,
                enabled: true,
            });
        }

        let repos: Vec<SkillRepo> = repos_by_key.into_values().collect();
        let checked_repos = repos.len();

        // 2. 重新解析远程仓库，构建两类映射：
        // - repo + full remote directory（优先，用于精确命中）
        // - repo + install_name（兜底）
        let mut discovered_by_repo_and_remote_dir: HashMap<
            (String, String, String),
            DiscoverableSkill,
        > = HashMap::new();
        let mut discovered_by_repo_and_install_name: HashMap<
            (String, String, String),
            DiscoverableSkill,
        > = HashMap::new();

        for repo in &repos {
            match self.fetch_repo_skills_cached(repo, db).await {
                Ok(discoverable_skills) => {
                    for remote_skill in discoverable_skills {
                        let remote_dir = remote_skill.directory.to_lowercase();
                        let install_name = Path::new(&remote_skill.directory)
                            .file_name()
                            .map(|segment| segment.to_string_lossy().to_string())
                            .unwrap_or_else(|| remote_skill.directory.clone())
                            .to_lowercase();

                        let remote_dir_key = (
                            repo.owner.to_lowercase(),
                            repo.name.to_lowercase(),
                            remote_dir,
                        );
                        discovered_by_repo_and_remote_dir
                            .entry(remote_dir_key)
                            .or_insert(remote_skill.clone());

                        let install_name_key = (
                            repo.owner.to_lowercase(),
                            repo.name.to_lowercase(),
                            install_name,
                        );
                        discovered_by_repo_and_install_name
                            .entry(install_name_key)
                            .or_insert(remote_skill);
                    }
                }
                Err(error) => {
                    log::warn!(
                        "刷新仓库 {}/{} 远程技能失败: {}",
                        repo.owner,
                        repo.name,
                        error
                    );
                }
            }
        }

        // 3. 对已安装技能进行回写更新
        let mut scanned_skills: usize = 0;
        let mut updated_skills: usize = 0;

        for installed_skill in &mut installed {
            let (Some(repo_owner), Some(repo_name)) =
                (&installed_skill.repo_owner, &installed_skill.repo_name)
            else {
                continue;
            };

            scanned_skills += 1;

            let install_name = installed_skill.directory.to_lowercase();
            let repo_owner_lower = repo_owner.to_lowercase();
            let repo_name_lower = repo_name.to_lowercase();
            let remote_dir_hint = installed_skill
                .id
                .split_once(':')
                .and_then(|(prefix, remote_dir)| {
                    if prefix.eq_ignore_ascii_case("local") {
                        None
                    } else {
                        Some(remote_dir.trim().to_lowercase())
                    }
                })
                .filter(|value| !value.is_empty());

            let remote_skill = remote_dir_hint
                .as_ref()
                .and_then(|remote_dir| {
                    discovered_by_repo_and_remote_dir
                        .get(&(repo_owner_lower.clone(), repo_name_lower.clone(), remote_dir.clone()))
                })
                .or_else(|| {
                    discovered_by_repo_and_install_name.get(&(
                        repo_owner_lower.clone(),
                        repo_name_lower.clone(),
                        install_name.clone(),
                    ))
                });

            let mut changed = false;

            if let Some(remote_skill) = remote_skill {
                let repo_branch = installed_skill
                    .repo_branch
                    .clone()
                    .unwrap_or_else(|| remote_skill.repo_branch.clone());
                let repo = SkillRepo {
                    owner: repo_owner.clone(),
                    name: repo_name.clone(),
                    branch: repo_branch,
                    enabled: true,
                };

                let remote_directory_for_resolve = remote_dir_hint
                    .clone()
                    .unwrap_or_else(|| remote_skill.directory.clone());

                let remote_tree_commit = if let Some(tree_sha) = remote_skill
                    .tree_sha
                    .clone()
                    .filter(|value| !value.trim().is_empty())
                {
                    Some(tree_sha)
                } else {
                    self.resolve_tree_commit_id(
                        &repo,
                        &remote_directory_for_resolve,
                        &installed_skill.directory,
                    )
                    .await
                };

                let remote_description = if remote_skill.description.trim().is_empty() {
                    None
                } else {
                    Some(remote_skill.description.clone())
                };

                if installed_skill.name != remote_skill.name {
                    installed_skill.name = remote_skill.name.clone();
                    changed = true;
                }
                if installed_skill.description != remote_description {
                    installed_skill.description = remote_description;
                    changed = true;
                }
                if installed_skill.repo_branch.as_deref() != Some(remote_skill.repo_branch.as_str())
                {
                    installed_skill.repo_branch = Some(remote_skill.repo_branch.clone());
                    changed = true;
                }
                if installed_skill.readme_url != remote_skill.readme_url {
                    installed_skill.readme_url = remote_skill.readme_url.clone();
                    changed = true;
                }
                if let Some(tree_commit_id) = remote_tree_commit {
                    if installed_skill.tree_commit_id.as_deref() != Some(tree_commit_id.as_str()) {
                        installed_skill.tree_commit_id = Some(tree_commit_id);
                        changed = true;
                    }
                }
            } else {
                // 兜底：若远程列表未命中，至少尝试更新 tree commit id
                let repo_branch = installed_skill
                    .repo_branch
                    .clone()
                    .unwrap_or_else(|| "main".to_string());
                let repo = SkillRepo {
                    owner: repo_owner.clone(),
                    name: repo_name.clone(),
                    branch: repo_branch,
                    enabled: true,
                };

                let remote_directory_for_resolve = remote_dir_hint
                    .clone()
                    .unwrap_or_else(|| installed_skill.directory.clone());

                let resolved_tree_commit = self
                    .resolve_tree_commit_id(
                        &repo,
                        &remote_directory_for_resolve,
                        &installed_skill.directory,
                    )
                    .await;

                if let Some(tree_commit_id) = resolved_tree_commit {
                    if installed_skill.tree_commit_id.as_deref() != Some(tree_commit_id.as_str()) {
                        installed_skill.tree_commit_id = Some(tree_commit_id);
                        changed = true;
                    }
                }
            }

            if changed {
                db.save_skill(installed_skill)?;
                updated_skills += 1;
            }
        }

        Ok(SkillRemoteRefreshResult {
            checked_repos,
            scanned_skills,
            updated_skills,
        })
    }
}

// ========== 迁移支持 ==========

/// 首次启动迁移：扫描应用目录，重建数据库
pub fn migrate_skills_to_ssot(db: &Arc<Database>) -> Result<usize> {
    let ssot_dir = SkillService::get_ssot_dir()?;
    let mut discovered: HashMap<String, SkillApps> = HashMap::new();

    // 扫描各应用目录
    for app in [
        AppType::Claude,
        AppType::Codex,
        AppType::Gemini,
        AppType::OpenCode,
        AppType::Cursor,
    ] {
        let app_dir = match SkillService::get_app_skills_dir(&app) {
            Ok(d) => d,
            Err(_) => continue,
        };

        if !app_dir.exists() {
            continue;
        }

        for entry in fs::read_dir(&app_dir)? {
            let entry = entry?;
            let path = entry.path();

            if !path.is_dir() {
                continue;
            }

            let dir_name = entry.file_name().to_string_lossy().to_string();

            // 跳过隐藏目录（以 . 开头，如 .system）
            if dir_name.starts_with('.') {
                continue;
            }

            // 复制到 SSOT（如果不存在）
            let ssot_path = ssot_dir.join(&dir_name);
            if !ssot_path.exists() {
                SkillService::copy_dir_recursive(&path, &ssot_path)?;
            }

            // 记录启用状态
            discovered
                .entry(dir_name)
                .or_default()
                .set_enabled_for(&app, true);
        }
    }

    // 重建数据库
    db.clear_skills()?;

    let mut count = 0;
    for (directory, apps) in discovered {
        let ssot_path = ssot_dir.join(&directory);
        let skill_md = ssot_path.join("SKILL.md");

        let (name, description) = if skill_md.exists() {
            match SkillService::parse_skill_metadata_static(&skill_md) {
                Ok(meta) => (
                    meta.name.unwrap_or_else(|| directory.clone()),
                    meta.description,
                ),
                Err(_) => (directory.clone(), None),
            }
        } else {
            (directory.clone(), None)
        };

        let skill = InstalledSkill {
            id: format!("local:{directory}"),
            name,
            description,
            directory,
            repo_owner: None,
            repo_name: None,
            repo_branch: None,
            readme_url: None,
            tree_commit_id: None,
            apps,
            installed_at: chrono::Utc::now().timestamp(),
        };

        db.save_skill(&skill)?;
        count += 1;
    }

    log::info!("Skills 迁移完成，共 {count} 个");

    Ok(count)
}



