//! Skills 命令层
//!
//! v3.10.0+ 统一管理架构：
//! - 支持三应用开关（Claude/Codex/Gemini）
//! - SSOT 存储在 ~/.config/mnemosyne/skills/

use crate::cc_switch::app_config::{AppType, InstalledSkill, UnmanagedSkill};
use crate::cc_switch::error::format_skill_error;
use crate::cc_switch::services::skill::{
    DiscoverableSkill, Skill, SkillFileContentResult, SkillFileTreeResult, SkillRemoteRefreshResult,
    SkillRepo, SkillService, SkillSingleRemoteRefreshResult, SkillUpdateInfo,
};
use crate::cc_switch::store::AppState;
use serde_json::json;
use serde_json::Value;
use std::sync::Arc;
use tauri::State;

/// SkillService 状态包装
pub struct SkillServiceState(pub Arc<SkillService>);

/// 解析 app 参数为 AppType
fn parse_app_type(app: &str) -> Result<AppType, String> {
    match app.to_lowercase().as_str() {
        "claude" => Ok(AppType::Claude),
        "codex" => Ok(AppType::Codex),
        "gemini" => Ok(AppType::Gemini),
        "opencode" => Ok(AppType::OpenCode),
        "cursor" => Ok(AppType::Cursor),
        _ => Err(format!("不支持的 app 类型: {app}")),
    }
}

// ========== 统一管理命令 ==========

/// 获取所有已安装的 Skills
#[tauri::command]
pub fn get_installed_skills(app_state: State<'_, AppState>) -> Result<Vec<InstalledSkill>, String> {
    SkillService::get_all_installed(&app_state.db).map_err(|e| e.to_string())
}

/// 获取单个已安装技能的文件树
#[tauri::command]
pub fn get_installed_skill_file_tree(
    skill_id: String,
    app_state: State<'_, AppState>,
) -> Result<SkillFileTreeResult, String> {
    SkillService::get_installed_skill_file_tree(&app_state.db, &skill_id).map_err(|e| e.to_string())
}

/// 读取单个已安装技能的文件内容
#[tauri::command]
pub fn read_installed_skill_file(
    skill_id: String,
    relative_path: String,
    app_state: State<'_, AppState>,
) -> Result<SkillFileContentResult, String> {
    SkillService::read_installed_skill_file(&app_state.db, &skill_id, &relative_path)
        .map_err(|e| e.to_string())
}

/// 重新解析远程仓库并刷新已安装技能元数据
#[tauri::command]
pub async fn refresh_installed_skills_remote(
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<SkillRemoteRefreshResult, String> {
    service
        .0
        .refresh_installed_from_remote(&app_state.db)
        .await
        .map_err(|e| e.to_string())
}

/// 重新解析远程仓库并刷新单个已安装技能元数据
#[tauri::command]
pub async fn refresh_installed_skill_remote(
    skill_id: String,
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<SkillSingleRemoteRefreshResult, String> {
    service
        .0
        .refresh_single_installed_from_remote(&app_state.db, &skill_id)
        .await
        .map_err(|e| e.to_string())
}

/// 安装 Skill（新版统一安装）
///
/// 参数：
/// - skill: 从发现列表获取的技能信息
/// - current_app: 当前选中的应用，安装后默认启用该应用
#[tauri::command]
pub async fn install_skill_unified(
    skill: DiscoverableSkill,
    current_app: String,
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<InstalledSkill, String> {
    let app_type = parse_app_type(&current_app)?;

    service
        .0
        .install(&app_state.db, &skill, &app_type)
        .await
        .map_err(|e| e.to_string())
}

/// 卸载 Skill（新版统一卸载）
#[tauri::command]
pub fn uninstall_skill_unified(id: String, app_state: State<'_, AppState>) -> Result<bool, String> {
    SkillService::uninstall(&app_state.db, &id).map_err(|e| e.to_string())?;
    Ok(true)
}

/// 切换 Skill 的应用启用状态
#[tauri::command]
pub fn toggle_skill_app(
    id: String,
    app: String,
    enabled: bool,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    let app_type = parse_app_type(&app)?;
    SkillService::toggle_app(&app_state.db, &id, &app_type, enabled).map_err(|e| e.to_string())?;
    Ok(true)
}

/// 扫描未管理的 Skills
#[tauri::command]
pub fn scan_unmanaged_skills(
    app_state: State<'_, AppState>,
) -> Result<Vec<UnmanagedSkill>, String> {
    SkillService::scan_unmanaged(&app_state.db).map_err(|e| e.to_string())
}

/// 从应用目录导入 Skills
#[tauri::command]
pub fn import_skills_from_apps(
    directories: Vec<String>,
    app_state: State<'_, AppState>,
) -> Result<Vec<InstalledSkill>, String> {
    SkillService::import_from_apps(&app_state.db, directories).map_err(|e| e.to_string())
}

// ========== 发现功能命令 ==========

/// 浏览 skills.sh 技能列表
///
/// 使用后端请求，避免 WebView 侧跨域限制。
#[tauri::command]
pub async fn browse_skills_sh(category: String, page: u32) -> Result<Value, String> {
    let normalized = match category.as_str() {
        "hot" => "hot",
        "trending" => "trending",
        "all-time" => "all-time",
        _ => return Err(format!("不支持的分类: {category}")),
    };

    let safe_page = page;
    let url = format!("https://skills.sh/api/skills/{normalized}/{safe_page}");

    // 复用全局 HTTP 客户端（含全局代理设置）
    let client = crate::cc_switch::proxy::http_client::get();
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("请求 skills.sh 失败: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("skills.sh 返回错误状态: HTTP {}", status.as_u16()));
    }

    response
        .json::<Value>()
        .await
        .map_err(|e| format!("解析 skills.sh 响应失败: {e}"))
}

/// 按关键词搜索 skills.sh 技能列表
#[tauri::command]
pub async fn search_skills_sh(query: String, limit: u32) -> Result<Value, String> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(json!({
            "skills": [],
            "total": 0,
            "hasMore": false
        }));
    }

    let safe_limit = limit.clamp(1, 100);

    // 复用全局 HTTP 客户端（含全局代理设置）
    let client = crate::cc_switch::proxy::http_client::get();
    let response = client
        .get("https://skills.sh/api/search")
        .query(&[
            ("q", normalized_query.to_string()),
            ("limit", safe_limit.to_string()),
        ])
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("请求 skills.sh 搜索接口失败: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!(
            "skills.sh 搜索接口返回错误状态: HTTP {}",
            status.as_u16()
        ));
    }

    response
        .json::<Value>()
        .await
        .map_err(|e| format!("解析 skills.sh 搜索响应失败: {e}"))
}

/// 发现可安装的 Skills（从仓库获取）
#[tauri::command]
pub async fn discover_available_skills(
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<Vec<DiscoverableSkill>, String> {
    let repos = app_state.db.get_skill_repos().map_err(|e| e.to_string())?;
    service
        .0
        .discover_available(repos, &app_state.db)
        .await
        .map_err(|e| e.to_string())
}

// ========== 兼容旧 API 的命令 ==========

/// 获取技能列表（兼容旧 API）
#[tauri::command]
pub async fn get_skills(
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    let repos = app_state.db.get_skill_repos().map_err(|e| e.to_string())?;
    service
        .0
        .list_skills(repos, &app_state.db)
        .await
        .map_err(|e| e.to_string())
}

/// 获取指定应用的技能列表（兼容旧 API）
#[tauri::command]
pub async fn get_skills_for_app(
    app: String,
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    // 新版本不再区分应用，统一返回所有技能
    let _ = parse_app_type(&app)?; // 验证 app 参数有效
    get_skills(service, app_state).await
}

/// 安装技能（兼容旧 API）
#[tauri::command]
pub async fn install_skill(
    directory: String,
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    install_skill_for_app("claude".to_string(), directory, service, app_state).await
}

/// 安装指定应用的技能（兼容旧 API）
#[tauri::command]
pub async fn install_skill_for_app(
    app: String,
    directory: String,
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    let app_type = parse_app_type(&app)?;

    // 先获取技能信息
    let repos = app_state.db.get_skill_repos().map_err(|e| e.to_string())?;
    let skills = service
        .0
        .discover_available(repos, &app_state.db)
        .await
        .map_err(|e| e.to_string())?;

    let skill = skills
        .into_iter()
        .find(|s| {
            let install_name = std::path::Path::new(&s.directory)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| s.directory.clone());
            install_name.eq_ignore_ascii_case(&directory)
                || s.directory.eq_ignore_ascii_case(&directory)
        })
        .ok_or_else(|| {
            format_skill_error(
                "SKILL_NOT_FOUND",
                &[("directory", &directory)],
                Some("checkRepoUrl"),
            )
        })?;

    service
        .0
        .install(&app_state.db, &skill, &app_type)
        .await
        .map_err(|e| e.to_string())?;

    Ok(true)
}

/// 卸载技能（兼容旧 API）
#[tauri::command]
pub fn uninstall_skill(directory: String, app_state: State<'_, AppState>) -> Result<bool, String> {
    uninstall_skill_for_app("claude".to_string(), directory, app_state)
}

/// 卸载指定应用的技能（兼容旧 API）
#[tauri::command]
pub fn uninstall_skill_for_app(
    app: String,
    directory: String,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    let _ = parse_app_type(&app)?; // 验证参数

    // 通过 directory 找到对应的 skill id
    let skills = SkillService::get_all_installed(&app_state.db).map_err(|e| e.to_string())?;

    let skill = skills
        .into_iter()
        .find(|s| s.directory.eq_ignore_ascii_case(&directory))
        .ok_or_else(|| format!("未找到已安装的 Skill: {directory}"))?;

    SkillService::uninstall(&app_state.db, &skill.id).map_err(|e| e.to_string())?;

    Ok(true)
}

// ========== 仓库管理命令 ==========

/// 获取技能仓库列表
#[tauri::command]
pub fn get_skill_repos(app_state: State<'_, AppState>) -> Result<Vec<SkillRepo>, String> {
    app_state.db.get_skill_repos().map_err(|e| e.to_string())
}

/// 添加技能仓库
#[tauri::command]
pub fn add_skill_repo(repo: SkillRepo, app_state: State<'_, AppState>) -> Result<bool, String> {
    app_state
        .db
        .save_skill_repo(&repo)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

/// 删除技能仓库
#[tauri::command]
pub fn remove_skill_repo(
    owner: String,
    name: String,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    app_state
        .db
        .delete_skill_repo(&owner, &name)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

// ========== 缓存管理命令 ==========

/// 检查技能更新（仅调用 Trees API，不克隆仓库）
#[tauri::command]
pub async fn check_skill_updates(
    service: State<'_, SkillServiceState>,
    app_state: State<'_, AppState>,
) -> Result<Vec<SkillUpdateInfo>, String> {
    let repos = app_state.db.get_skill_repos().map_err(|e| e.to_string())?;
    service
        .0
        .check_updates(repos, &app_state.db)
        .await
        .map_err(|e| e.to_string())
}

/// 清空技能缓存
#[tauri::command]
pub fn clear_skill_cache(
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    SkillService::clear_cache(&app_state.db).map_err(|e| e.to_string())?;
    Ok(true)
}

