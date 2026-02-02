//! Cursor MCP 同步和导入模块
//!
//! Cursor MCP 特性：
//! - 支持 OAuth 静态配置（CLIENT_ID、CLIENT_SECRET、scopes）
//! - 环境变量插值：${env:NAME}、${userHome}、${workspaceFolder}
//! - 固定 OAuth 回调 URL：http://localhost:63209/oauth/callback
//! - 配置文件：~/.cursor/mcp.json

use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::cc_switch::app_config::{McpApps, McpServer, MultiAppConfig};
use crate::cc_switch::config::write_json_file;
use crate::cc_switch::error::AppError;

use super::validation::validate_server_spec;

// ============================================================================
// 路径函数
// ============================================================================

/// 获取 Cursor 配置目录
pub fn get_cursor_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".cursor"))
        .unwrap_or_else(|| PathBuf::from(".cursor"))
}

/// 获取 Cursor MCP 配置文件路径
pub fn get_cursor_mcp_path() -> PathBuf {
    get_cursor_dir().join("mcp.json")
}

/// 检查是否应该同步 Cursor MCP
fn should_sync_cursor_mcp() -> bool {
    get_cursor_dir().exists()
}

// ============================================================================
// 格式转换：CC Switch → Cursor
// ============================================================================

/// 将统一格式转换为 Cursor 格式
///
/// 转换规则：
/// - stdio: 直接转换，保留 command、args、env、envFile
/// - SSE/HTTP: 添加 OAuth 配置（如果有 auth 对象）
pub fn convert_to_cursor_format(spec: &Value) -> Result<Value, AppError> {
    let obj = spec
        .as_object()
        .ok_or_else(|| {
            AppError::McpValidation("MCP spec must be a JSON object".to_string())
        })?
        .clone();

    let typ = obj.get("type").and_then(|v| v.as_str()).unwrap_or("stdio");

    // 对于 stdio 类型，直接返回
    if typ == "stdio" {
        return Ok(Value::Object(obj));
    }

    // 对于 SSE/HTTP 类型，直接返回（Cursor 支持这些类型）
    if typ == "sse" || typ == "http" {
        return Ok(Value::Object(obj));
    }

    Err(AppError::McpValidation(format!(
        "Unknown MCP type: {typ}"
    )))
}

// ============================================================================
// 格式转换：Cursor → CC Switch
// ============================================================================

/// 将 Cursor 格式转换为统一格式
///
/// 转换规则：
/// - 移除 auth 对象（OAuth 配置不存储在统一结构中）
/// - 移除 envFile（Cursor 特有字段）
/// - 保留 stdio/sse/http 类型
pub fn convert_from_cursor_format(spec: &Value) -> Result<Value, AppError> {
    let mut obj = spec
        .as_object()
        .ok_or_else(|| {
            AppError::McpValidation("Cursor MCP spec must be a JSON object".to_string())
        })?
        .clone();

    // 移除 Cursor 特有的字段
    obj.remove("auth");
    obj.remove("envFile");

    // 验证转换后的规范
    let result = Value::Object(obj);
    validate_server_spec(&result)?;

    Ok(result)
}

// ============================================================================
// 公共 API：导入功能
// ============================================================================

/// 从 Cursor MCP 配置导入到统一结构
///
/// 已存在的服务器将启用 Cursor 应用，不覆盖其他字段和应用状态
pub fn import_from_cursor(config: &mut MultiAppConfig) -> Result<usize, AppError> {
    let path = get_cursor_mcp_path();

    if !path.exists() {
        return Ok(0);
    }

    // 读取 Cursor mcp.json
    let content = std::fs::read_to_string(&path)
        .map_err(|e| AppError::io(&path, e))?;

    let root: Value = serde_json::from_str(&content)
        .map_err(|e| AppError::json(&path, e))?;

    // Cursor mcp.json 格式与 Claude 相同，有 mcpServers 顶层键
    let servers_map = root
        .get("mcpServers")
        .and_then(|v| v.as_object())
        .ok_or_else(|| {
            AppError::McpValidation("Cursor mcp.json must have 'mcpServers' object".to_string())
        })?;

    // 确保新结构存在
    let servers = config.mcp.servers.get_or_insert_with(HashMap::new);

    let mut changed = 0;
    let mut errors = Vec::new();

    for (id, cursor_spec) in servers_map {
        // 转换为统一格式
        let unified_spec = match convert_from_cursor_format(cursor_spec) {
            Ok(spec) => spec,
            Err(e) => {
                log::warn!("跳过无效的 Cursor MCP 服务器 '{id}': {e}");
                errors.push(format!("{id}: {e}"));
                continue;
            }
        };

        if let Some(existing) = servers.get_mut(id) {
            // 已存在：仅启用 Cursor 应用
            if !existing.apps.cursor {
                existing.apps.cursor = true;
                changed += 1;
                log::info!("MCP 服务器 '{id}' 已启用 Cursor 应用");
            }
        } else {
            // 新建服务器：默认仅启用 Cursor
            servers.insert(
                id.clone(),
                McpServer {
                    id: id.clone(),
                    name: id.clone(),
                    server: unified_spec,
                    apps: McpApps {
                        claude: false,
                        codex: false,
                        gemini: false,
                        opencode: false,
                        cursor: true,
                    },
                    description: None,
                    homepage: None,
                    docs: None,
                    tags: Vec::new(),
                },
            );
            changed += 1;
            log::info!("导入新 MCP 服务器 '{id}' 从 Cursor");
        }
    }

    if !errors.is_empty() {
        log::warn!("导入完成，但有 {} 项失败: {:?}", errors.len(), errors);
    }

    Ok(changed)
}

// ============================================================================
// 公共 API：同步功能
// ============================================================================

/// 将单个 MCP 服务器同步到 Cursor live 配置
pub fn sync_single_server_to_cursor(
    _config: &MultiAppConfig,
    id: &str,
    server_spec: &Value,
) -> Result<(), AppError> {
    if !should_sync_cursor_mcp() {
        return Ok(());
    }

    // 转换为 Cursor 格式
    let cursor_spec = convert_to_cursor_format(server_spec)?;

    // 读取现有配置
    let path = get_cursor_mcp_path();
    let mut root = if path.exists() {
        let content = std::fs::read_to_string(&path)
            .map_err(|e| AppError::io(&path, e))?;
        serde_json::from_str::<Value>(&content)
            .map_err(|e| AppError::json(&path, e))?
    } else {
        json!({ "mcpServers": {} })
    };

    // 确保 root 有 mcpServers 对象
    let root_obj = root
        .get_mut("mcpServers")
        .and_then(|v| v.as_object_mut())
        .ok_or_else(|| {
            AppError::McpValidation("Cursor mcp.json must have 'mcpServers' object".to_string())
        })?;

    // 添加/更新服务器
    root_obj.insert(id.to_string(), cursor_spec);

    // 写回文件
    write_cursor_config(&root)
}

/// 从 Cursor live 配置中移除单个 MCP 服务器
pub fn remove_server_from_cursor(id: &str) -> Result<(), AppError> {
    if !should_sync_cursor_mcp() {
        return Ok(());
    }

    let path = get_cursor_mcp_path();
    if !path.exists() {
        return Ok(());
    }

    // 读取现有配置
    let content = std::fs::read_to_string(&path)
        .map_err(|e| AppError::io(&path, e))?;
    let mut root: Value = serde_json::from_str(&content)
        .map_err(|e| AppError::json(&path, e))?;

    // 从 mcpServers 对象中移除服务器
    if let Some(mcp_servers) = root.get_mut("mcpServers").and_then(|v| v.as_object_mut()) {
        mcp_servers.remove(id);
    }

    // 写回文件
    write_cursor_config(&root)
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 写入 Cursor MCP 配置文件
fn write_cursor_config(config: &Value) -> Result<(), AppError> {
    let path = get_cursor_mcp_path();
    write_json_file(&path, config)?;

    log::debug!("Cursor MCP 配置已写入: {:?}", path);
    Ok(())
}
