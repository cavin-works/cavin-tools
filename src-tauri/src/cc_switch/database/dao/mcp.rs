//! MCP 服务器数据访问对象
//!
//! 提供 MCP 服务器的 CRUD 操作。

use crate::cc_switch::app_config::{McpApps, McpServer};
use crate::cc_switch::database::{lock_conn, Database};
use crate::cc_switch::error::AppError;
use indexmap::IndexMap;
use rusqlite::params;

impl Database {
    /// 获取所有 MCP 服务器
    pub fn get_all_mcp_servers(&self) -> Result<IndexMap<String, McpServer>, AppError> {
        let conn = lock_conn!(self.conn);
        let mut stmt = conn.prepare(
            "SELECT id, name, server_config, description, homepage, docs, tags, enabled_claude, enabled_codex, enabled_gemini, enabled_opencode, enabled_cursor
             FROM mcp_servers
             ORDER BY name ASC, id ASC"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let server_iter = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,          // id
                    row.get::<_, String>(1)?,          // name
                    row.get::<_, String>(2)?,          // server_config (raw)
                    row.get::<_, Option<String>>(3)?,  // description
                    row.get::<_, Option<String>>(4)?,  // homepage
                    row.get::<_, Option<String>>(5)?,  // docs
                    row.get::<_, String>(6)?,          // tags (raw)
                    row.get::<_, bool>(7)?,            // enabled_claude
                    row.get::<_, bool>(8)?,            // enabled_codex
                    row.get::<_, bool>(9)?,            // enabled_gemini
                    row.get::<_, bool>(10)?,           // enabled_opencode
                    row.get::<_, bool>(11)?,           // enabled_cursor
                ))
            })
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut servers = IndexMap::new();
        for row_res in server_iter {
            let (
                id,
                name,
                server_config_str,
                description,
                homepage,
                docs,
                tags_str,
                enabled_claude,
                enabled_codex,
                enabled_gemini,
                enabled_opencode,
                enabled_cursor,
            ) = row_res.map_err(|e| AppError::Database(e.to_string()))?;

            // JSON 解析失败时跳过该行并记录错误，绝不把默认值交给上层，
            // 否则读-改-写流程会把损坏行覆盖成空配置（用户数据丢失）。
            // 跳过的行仍保留在数据库中，不会被任何保存路径触碰。
            let server = match serde_json::from_str(&server_config_str) {
                Ok(v) => v,
                Err(e) => {
                    log::error!(
                        "[DAO] MCP 服务器 {id} 的 server_config JSON 解析失败，已跳过该行: {e}"
                    );
                    continue;
                }
            };
            let tags = match serde_json::from_str(&tags_str) {
                Ok(v) => v,
                Err(e) => {
                    log::error!("[DAO] MCP 服务器 {id} 的 tags JSON 解析失败，已跳过该行: {e}");
                    continue;
                }
            };

            servers.insert(
                id.clone(),
                McpServer {
                    id,
                    name,
                    server,
                    apps: McpApps {
                        claude: enabled_claude,
                        codex: enabled_codex,
                        gemini: enabled_gemini,
                        opencode: enabled_opencode,
                        cursor: enabled_cursor,
                    },
                    description,
                    homepage,
                    docs,
                    tags,
                },
            );
        }
        Ok(servers)
    }

    /// 保存 MCP 服务器
    pub fn save_mcp_server(&self, server: &McpServer) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute(
            "INSERT OR REPLACE INTO mcp_servers (
                id, name, server_config, description, homepage, docs, tags,
                enabled_claude, enabled_codex, enabled_gemini, enabled_opencode, enabled_cursor
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                server.id,
                server.name,
                serde_json::to_string(&server.server).map_err(|e| AppError::Database(format!(
                    "Failed to serialize server config: {e}"
                )))?,
                server.description,
                server.homepage,
                server.docs,
                serde_json::to_string(&server.tags)
                    .map_err(|e| AppError::Database(format!("Failed to serialize tags: {e}")))?,
                server.apps.claude,
                server.apps.codex,
                server.apps.gemini,
                server.apps.opencode,
                server.apps.cursor,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    /// 删除 MCP 服务器
    pub fn delete_mcp_server(&self, id: &str) -> Result<(), AppError> {
        let conn = lock_conn!(self.conn);
        conn.execute("DELETE FROM mcp_servers WHERE id = ?1", params![id])
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}

