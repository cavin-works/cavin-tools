//! Agents 服务层
//!
//! 管理 Claude Code 自定义智能体文件（`~/.claude/agents/*.md`）。
//! 目录即事实源：文件存在即启用，删除即移除，无数据库、无启用状态。

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::cc_switch::config::{get_claude_config_dir, write_text_file};
use crate::cc_switch::error::AppError;

/// Agent 列表项
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSummary {
    /// 显示名称（frontmatter name，缺失时回退文件名去后缀）
    pub name: String,
    /// 触发条件描述
    pub description: String,
    /// 可用工具（逗号分隔字符串，原样保留）
    pub tools: Option<String>,
    /// 模型
    pub model: Option<String>,
    /// 文件名（含 .md 后缀，作为唯一标识）
    pub filename: String,
    /// 文件修改时间（Unix 秒）
    pub updated_at: i64,
    /// frontmatter 解析失败标志
    pub parse_error: bool,
}

/// frontmatter 字段（tools/model 可选，tools 为逗号分隔字符串）
#[derive(Debug, Default, Deserialize)]
struct AgentFrontmatter {
    name: Option<String>,
    description: Option<String>,
    tools: Option<String>,
    model: Option<String>,
}

pub struct AgentService;

impl AgentService {
    /// agents 目录（get_claude_config_dir()/agents，尊重目录覆盖设置），不存在则创建
    pub fn agents_dir() -> Result<PathBuf, AppError> {
        let dir = get_claude_config_dir().join("agents");
        fs::create_dir_all(&dir).map_err(|e| AppError::io(&dir, e))?;
        Ok(dir)
    }

    pub fn list_agents() -> Result<Vec<AgentSummary>, AppError> {
        Self::list_agents_in(&Self::agents_dir()?)
    }

    pub fn read_agent(filename: &str) -> Result<String, AppError> {
        Self::read_agent_in(&Self::agents_dir()?, filename)
    }

    pub fn save_agent(filename: &str, content: &str) -> Result<(), AppError> {
        Self::save_agent_in(&Self::agents_dir()?, filename, content)
    }

    pub fn delete_agent(filename: &str) -> Result<(), AppError> {
        Self::delete_agent_in(&Self::agents_dir()?, filename)
    }

    /// 核心逻辑（目录可注入，供测试使用）
    fn list_agents_in(dir: &Path) -> Result<Vec<AgentSummary>, AppError> {
        let mut agents = Vec::new();
        let entries = fs::read_dir(dir).map_err(|e| AppError::io(dir, e))?;
        for entry in entries {
            let entry = entry.map_err(|e| AppError::io(dir, e))?;
            let path = entry.path();
            let is_md = path.is_file()
                && path.extension().map(|ext| ext == "md").unwrap_or(false);
            if !is_md {
                continue;
            }
            let Some(filename) = path.file_name().and_then(|n| n.to_str()) else {
                continue;
            };
            let updated_at = entry
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            let (meta, parse_error) = fs::read_to_string(&path)
                .map(|content| parse_frontmatter(&content))
                .unwrap_or((AgentFrontmatter::default(), true));
            agents.push(AgentSummary {
                name: meta
                    .name
                    .filter(|n| !n.trim().is_empty())
                    .unwrap_or_else(|| filename.strip_suffix(".md").unwrap_or(filename).to_string()),
                description: meta.description.unwrap_or_default(),
                tools: meta.tools,
                model: meta.model,
                filename: filename.to_string(),
                updated_at,
                parse_error,
            });
        }
        agents.sort_by(|a, b| a.filename.cmp(&b.filename));
        Ok(agents)
    }

    fn read_agent_in(dir: &Path, filename: &str) -> Result<String, AppError> {
        let path = dir.join(validate_filename(filename)?);
        fs::read_to_string(&path).map_err(|e| AppError::io(&path, e))
    }

    fn save_agent_in(dir: &Path, filename: &str, content: &str) -> Result<(), AppError> {
        let path = dir.join(validate_filename(filename)?);
        write_text_file(&path, content)
    }

    fn delete_agent_in(dir: &Path, filename: &str) -> Result<(), AppError> {
        let path = dir.join(validate_filename(filename)?);
        fs::remove_file(&path).map_err(|e| AppError::io(&path, e))
    }
}

/// 解析 frontmatter（`---` 分隔），缺失或 YAML 非法/缺 name 时标记 parse_error
fn parse_frontmatter(content: &str) -> (AgentFrontmatter, bool) {
    let content = content.trim_start_matches('\u{feff}');
    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() < 3 {
        return (AgentFrontmatter::default(), true);
    }
    match serde_yaml::from_str::<AgentFrontmatter>(parts[1].trim()) {
        Ok(meta) => {
            let has_name = meta.name.as_deref().map(|n| !n.trim().is_empty()).unwrap_or(false);
            (meta, !has_name)
        }
        Err(_) => (AgentFrontmatter::default(), true),
    }
}

/// 校验文件名：仅字母数字-_，必须 .md 后缀（防路径穿越）
fn validate_filename(filename: &str) -> Result<String, AppError> {
    let filename = filename.trim();
    let Some(stem) = filename.strip_suffix(".md") else {
        return Err(AppError::InvalidInput(format!("非法文件名: {filename}")));
    };
    let valid = !stem.is_empty()
        && stem
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !valid {
        return Err(AppError::InvalidInput(format!("非法文件名: {filename}")));
    }
    Ok(filename.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_empty_dir_returns_empty() {
        let dir = tempfile::tempdir().unwrap();
        let agents = AgentService::list_agents_in(dir.path()).unwrap();
        assert!(agents.is_empty());
    }

    #[test]
    fn save_list_read_delete_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        let content = "---\nname: code-reviewer\ndescription: 审查代码\ntools: Read, Grep\nmodel: sonnet\n---\n\nYou are a reviewer.";

        AgentService::save_agent_in(dir.path(), "code-reviewer.md", content).unwrap();

        let agents = AgentService::list_agents_in(dir.path()).unwrap();
        assert_eq!(agents.len(), 1);
        let a = &agents[0];
        assert_eq!(a.name, "code-reviewer");
        assert_eq!(a.description, "审查代码");
        assert_eq!(a.tools.as_deref(), Some("Read, Grep"));
        assert_eq!(a.model.as_deref(), Some("sonnet"));
        assert_eq!(a.filename, "code-reviewer.md");
        assert!(!a.parse_error);

        let read = AgentService::read_agent_in(dir.path(), "code-reviewer.md").unwrap();
        assert_eq!(read, content);

        AgentService::delete_agent_in(dir.path(), "code-reviewer.md").unwrap();
        assert!(AgentService::list_agents_in(dir.path()).unwrap().is_empty());
    }

    #[test]
    fn malformed_files_listed_with_parse_error() {
        let dir = tempfile::tempdir().unwrap();
        // 无 frontmatter
        AgentService::save_agent_in(dir.path(), "no-frontmatter.md", "just text").unwrap();
        // frontmatter 缺 name
        AgentService::save_agent_in(dir.path(), "no-name.md", "---\ndescription: x\n---\nbody").unwrap();
        // YAML 非法
        AgentService::save_agent_in(dir.path(), "bad-yaml.md", "---\nname: [unclosed\n---\nbody").unwrap();
        // 非 md 文件应被忽略
        AgentService::save_agent_in(dir.path(), "notes.txt", "x").unwrap();

        let agents = AgentService::list_agents_in(dir.path()).unwrap();
        assert_eq!(agents.len(), 3);
        for a in &agents {
            assert!(a.parse_error, "{} should have parse_error", a.filename);
        }
        // name 回退到文件名
        let no_frontmatter = agents.iter().find(|a| a.filename == "no-frontmatter.md").unwrap();
        assert_eq!(no_frontmatter.name, "no-frontmatter");
        assert_eq!(no_frontmatter.description, "");
    }

    #[test]
    fn rejects_malicious_filenames() {
        let dir = tempfile::tempdir().unwrap();
        for evil in ["../evil.md", "..\\evil.md", "a/b.md", "a\\b.md", ".md", "evil.txt", "a b.md", "名字.md"] {
            assert!(AgentService::save_agent_in(dir.path(), evil, "x").is_err(), "{evil} should be rejected");
        }
        assert!(AgentService::list_agents_in(dir.path()).unwrap().is_empty());
        // 合法文件名放行
        assert!(AgentService::save_agent_in(dir.path(), "My-Agent_1.md", "x").is_ok());
    }
}
