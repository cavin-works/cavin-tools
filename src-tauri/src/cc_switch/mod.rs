//! CC Switch module - AI Assistant for Claude Code, Codex & Gemini CLI
//!
//! This module contains all the functionality migrated from the cc-switch project.

pub mod app_config;
pub mod app_store;
pub mod auto_launch;
pub mod claude_mcp;
pub mod claude_plugin;
pub mod codex_config;
pub mod commands;
pub mod config;
pub mod database;
pub mod deeplink;
pub mod error;
pub mod gemini_config;
pub mod gemini_mcp;
pub mod init_status;
pub mod mcp;
pub mod opencode_config;
pub mod panic_hook;
pub mod path_migration;
pub mod prompt;
pub mod prompt_files;
pub mod provider;
pub mod provider_defaults;
pub mod proxy;
pub mod services;
pub mod settings;
pub mod store;
pub mod tray;
pub mod usage_script;

// Re-exports for convenient access
pub use app_config::{AppType, McpApps, McpServer, MultiAppConfig};
pub use codex_config::{get_codex_auth_path, get_codex_config_path, write_codex_live_atomic};
pub use commands::open_provider_terminal;
pub use commands::*;
pub use config::{get_claude_mcp_path, get_claude_settings_path, read_json_file};
pub use database::Database;
pub use deeplink::{import_provider_from_deeplink, parse_deeplink_url, DeepLinkImportRequest};
pub use error::AppError;
pub use mcp::{
    import_from_claude, import_from_codex, import_from_gemini, remove_server_from_claude,
    remove_server_from_codex, remove_server_from_gemini, sync_enabled_to_claude,
    sync_enabled_to_codex, sync_enabled_to_gemini, sync_single_server_to_claude,
    sync_single_server_to_codex, sync_single_server_to_gemini,
};
pub use provider::{Provider, ProviderMeta};
pub use services::{
    ConfigService, EndpointLatency, McpService, PromptService, ProviderService, ProxyService,
    SkillService, SpeedtestService,
};
pub use settings::{update_settings, AppSettings};
pub use store::AppState;
