//! Mnemosyne - All-in-One Toolkit with AI Assistant
//!
//! This application combines:
//! - Video/Image processing tools (FFmpeg, image converter, background remover, etc.)
//! - CC Switch AI Assistant (Claude Code, Codex, Gemini CLI management)

use std::sync::Arc;
use tauri::Emitter;
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, RunEvent};

// ============================================================
// Mnemosyne modules (video/image processing)
// ============================================================
pub mod background_remover;
pub mod ffmpeg;
pub mod image_converter;
pub mod models;
pub mod process_manager;
pub mod updater;
pub mod watermark_remover;

// ============================================================
// CC Switch module (AI Assistant)
// ============================================================
pub mod cc_switch;

// Import process manager commands
use process_manager::{
    get_processes, kill_port_command, kill_process_command, query_port_command,
    query_ports_by_pid_command, search_processes,
};

// Import CC Switch types
use cc_switch::{AppState, SkillService};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

// ============================================================
// Mnemosyne Commands (Video/Image Processing)
// ============================================================

#[tauri::command]
async fn check_ffmpeg() -> Result<ffmpeg::FfmpegInfo, String> {
    ffmpeg::check_ffmpeg_available()
}

#[tauri::command]
async fn download_ffmpeg() -> Result<String, String> {
    ffmpeg::download_ffmpeg().await
}

#[tauri::command]
async fn generate_thumbnails(
    input_path: String,
    count: usize,
    start_index: Option<usize>,
    total_count: Option<usize>,
) -> Result<Vec<String>, String> {
    ffmpeg::generate_thumbnails(input_path, count, start_index, total_count).await
}

#[tauri::command]
async fn load_video(path: String) -> Result<models::VideoInfo, String> {
    ffmpeg::get_video_info(path).await
}

#[tauri::command]
async fn compress_video_command(
    input_path: String,
    params: ffmpeg::CompressParams,
    window: tauri::Window,
) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let parent_dir = input_path_obj
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}\\{}_compressed.{}", parent_dir, filename, extension);

    let window_clone = window.clone();
    ffmpeg::compress_video(input_path, output_path.clone(), params, move |progress| {
        let _ = window_clone.emit("progress", progress);
    })
    .await?;

    Ok(output_path)
}

#[tauri::command]
async fn change_video_speed(
    input_path: String,
    params: ffmpeg::SpeedParams,
) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let parent_dir = input_path_obj
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!(
        "{}\\{}_speed_{}x.{}",
        parent_dir, filename, params.speed, extension
    );

    ffmpeg::change_video_speed(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

#[tauri::command]
async fn extract_frames(
    input_path: String,
    params: ffmpeg::ExtractParams,
) -> Result<Vec<String>, String> {
    ffmpeg::extract_frames(input_path, params).await
}

#[tauri::command]
async fn trim_video(input_path: String, params: ffmpeg::TrimParams) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let parent_dir = input_path_obj
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}\\{}_trimmed.{}", parent_dir, filename, extension);

    ffmpeg::trim_video(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

#[tauri::command]
async fn convert_to_gif(input_path: String, params: ffmpeg::GifParams) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let parent_dir = input_path_obj
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    let output_path = format!("{}\\{}.gif", parent_dir, filename);

    ffmpeg::convert_to_gif(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

#[tauri::command]
async fn process_operation_queue(
    input_path: String,
    operations: Vec<models::QueueOperation>,
    window: tauri::Window,
) -> Result<String, String> {
    use tempfile::NamedTempFile;

    let mut current_path = input_path.clone();
    let mut temp_files: Vec<String> = Vec::new();
    let total_operations = operations.len();

    let process_result = async {
        for (index, operation) in operations.iter().enumerate() {
            let is_last = index == total_operations - 1;
            let output_path = if is_last {
                let input_path_obj = std::path::Path::new(&input_path);
                let parent_dir = input_path_obj.parent().unwrap_or(std::path::Path::new("."));
                let filename = input_path_obj
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("output");
                let extension = match operation.operation_type.as_str() {
                    "to_gif" => "gif",
                    _ => input_path_obj
                        .extension()
                        .and_then(|s| s.to_str())
                        .unwrap_or("mp4"),
                };
                parent_dir
                    .join(format!("{}_final.{}", filename, extension))
                    .to_str()
                    .unwrap()
                    .to_string()
            } else {
                let extension = match operation.operation_type.as_str() {
                    "to_gif" => "gif",
                    _ => input_path.split('.').last().unwrap_or("mp4"),
                };
                let temp_file =
                    NamedTempFile::new().map_err(|e| format!("创建临时文件失败: {}", e))?;
                let temp_path_with_ext = temp_file.path().with_extension(extension);
                let temp_path_kept = temp_file
                    .into_temp_path()
                    .keep()
                    .map_err(|e| format!("保持临时文件失败: {}", e))?;
                std::fs::rename(&temp_path_kept, &temp_path_with_ext)
                    .map_err(|e| format!("重命名临时文件失败: {}", e))?;
                temp_path_with_ext.to_str().unwrap().to_string()
            };

            temp_files.push(output_path.clone());

            let window_clone = window.clone();
            match operation.operation_type.as_str() {
                "compress" => {
                    let params = serde_json::from_value(operation.params.clone())
                        .map_err(|e| format!("解析压缩参数失败: {}", e))?;
                    ffmpeg::compress_video(
                        current_path.clone(),
                        output_path.clone(),
                        params,
                        move |progress| {
                            let _ = window_clone.emit("progress", progress);
                        },
                    )
                    .await?;
                }
                "speed" => {
                    let params = serde_json::from_value(operation.params.clone())
                        .map_err(|e| format!("解析变速参数失败: {}", e))?;
                    ffmpeg::change_video_speed(current_path.clone(), output_path.clone(), params)
                        .await?;
                }
                "trim" => {
                    let params = serde_json::from_value(operation.params.clone())
                        .map_err(|e| format!("解析截断参数失败: {}", e))?;
                    ffmpeg::trim_video(current_path.clone(), output_path.clone(), params).await?;
                }
                "to_gif" => {
                    let params = serde_json::from_value(operation.params.clone())
                        .map_err(|e| format!("解析GIF参数失败: {}", e))?;
                    ffmpeg::convert_to_gif(current_path.clone(), output_path.clone(), params)
                        .await?;
                }
                "extract_frames" => {
                    continue;
                }
                _ => {
                    return Err(format!("未知的操作类型: {}", operation.operation_type));
                }
            }

            current_path = output_path;
        }

        for temp_file in temp_files.iter().take(temp_files.len() - 1) {
            let _ = std::fs::remove_file(temp_file);
        }

        Ok(current_path)
    }
    .await;

    match process_result {
        Ok(final_path) => Ok(final_path),
        Err(error) => {
            for temp_file in &temp_files {
                let _ = std::fs::remove_file(temp_file);
            }
            Err(error)
        }
    }
}

#[tauri::command]
async fn get_image_info(path: String) -> Result<models::ImageInfo, String> {
    image_converter::get_image_info(path)
}

#[tauri::command]
async fn convert_image(
    input_path: String,
    params: image_converter::ConvertParams,
) -> Result<image_converter::ConvertResult, String> {
    image_converter::convert_image(input_path, params).await
}

#[tauri::command]
async fn batch_convert_images(
    input_paths: Vec<String>,
    params: image_converter::ConvertParams,
    window: tauri::Window,
) -> Result<Vec<Result<image_converter::ConvertResult, String>>, String> {
    let window_clone = window.clone();
    image_converter::batch_convert_images(input_paths, params, move |current, total| {
        let _ = window_clone.emit(
            "batch-progress",
            serde_json::json!({
                "current": current,
                "total": total,
                "percentage": (current as f32 / total as f32 * 100.0)
            }),
        );
    })
    .await
}

#[tauri::command]
async fn remove_watermark(
    input_path: String,
    params: watermark_remover::RemoveParams,
) -> Result<watermark_remover::RemoveResult, String> {
    watermark_remover::remove_watermark(input_path, params).await
}

#[tauri::command]
async fn batch_remove_watermarks(
    input_paths: Vec<String>,
    params: watermark_remover::RemoveParams,
    window: tauri::Window,
) -> Result<Vec<Result<watermark_remover::RemoveResult, String>>, String> {
    let window_clone = window.clone();
    watermark_remover::batch_remove_watermarks(input_paths, params, move |current, total| {
        let _ = window_clone.emit(
            "watermark-batch-progress",
            serde_json::json!({
                "current": current,
                "total": total,
                "percentage": (current as f32 / total as f32 * 100.0)
            }),
        );
    })
    .await
}

#[tauri::command]
async fn check_bg_model_status() -> Result<background_remover::ModelInfo, String> {
    background_remover::check_model_status()
}

#[tauri::command]
async fn download_bg_model(window: tauri::Window) -> Result<String, String> {
    let window_clone = window.clone();
    background_remover::download_model(move |progress| {
        let _ = window_clone.emit("bg-model-download-progress", &progress);
    })
    .await
}

#[tauri::command]
async fn remove_image_background(
    input_path: String,
    params: background_remover::RemoveBackgroundParams,
) -> Result<background_remover::RemoveBackgroundResult, String> {
    background_remover::remove_background(input_path, params).await
}

#[tauri::command]
async fn batch_remove_image_backgrounds(
    input_paths: Vec<String>,
    params: background_remover::RemoveBackgroundParams,
    window: tauri::Window,
) -> Result<Vec<Result<background_remover::RemoveBackgroundResult, String>>, String> {
    let window_clone = window.clone();
    background_remover::batch_remove_backgrounds(input_paths, params, move |current, total| {
        let _ = window_clone.emit(
            "bg-remove-batch-progress",
            serde_json::json!({
                "current": current,
                "total": total,
                "percentage": (current as f32 / total as f32 * 100.0)
            }),
        );
    })
    .await
}

// ============================================================
// CC Switch Commands (Tray Menu Update)
// ============================================================

#[tauri::command]
async fn update_tray_menu(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    match cc_switch::tray::create_tray_menu(&app, state.inner()) {
        Ok(new_menu) => {
            if let Some(tray) = app.tray_by_id("main") {
                tray.set_menu(Some(new_menu))
                    .map_err(|e| format!("更新托盘菜单失败: {e}"))?;
                return Ok(true);
            }
            Ok(false)
        }
        Err(err) => {
            log::error!("创建托盘菜单失败: {err}");
            Ok(false)
        }
    }
}

// ============================================================
// Helper Functions
// ============================================================

fn redact_url_for_log(url_str: &str) -> String {
    match url::Url::parse(url_str) {
        Ok(url) => {
            let mut output = format!("{}://", url.scheme());
            if let Some(host) = url.host_str() {
                output.push_str(host);
            }
            output.push_str(url.path());

            let mut keys: Vec<String> = url.query_pairs().map(|(k, _)| k.to_string()).collect();
            keys.sort();
            keys.dedup();

            if !keys.is_empty() {
                output.push_str("?[keys:");
                output.push_str(&keys.join(","));
                output.push(']');
            }

            output
        }
        Err(_) => {
            let base = url_str.split('#').next().unwrap_or(url_str);
            match base.split_once('?') {
                Some((prefix, _)) => format!("{prefix}?[redacted]"),
                None => base.to_string(),
            }
        }
    }
}

fn handle_deeplink_url(
    app: &tauri::AppHandle,
    url_str: &str,
    focus_main_window: bool,
    source: &str,
) -> bool {
    if !url_str.starts_with("ccswitch://") {
        return false;
    }

    let redacted_url = redact_url_for_log(url_str);
    log::info!("✓ Deep link URL detected from {source}: {redacted_url}");
    log::debug!("Deep link URL (raw) from {source}: {url_str}");

    match cc_switch::deeplink::parse_deeplink_url(url_str) {
        Ok(request) => {
            log::info!(
                "✓ Successfully parsed deep link: resource={}, app={:?}, name={:?}",
                request.resource,
                request.app,
                request.name
            );

            if let Err(e) = app.emit("deeplink-import", &request) {
                log::error!("✗ Failed to emit deeplink-import event: {e}");
            } else {
                log::info!("✓ Emitted deeplink-import event to frontend");
            }

            if focus_main_window {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                    log::info!("✓ Window shown and focused");
                }
            }
        }
        Err(e) => {
            log::error!("✗ Failed to parse deep link URL: {e}");

            if let Err(emit_err) = app.emit(
                "deeplink-error",
                serde_json::json!({
                    "url": url_str,
                    "error": e.to_string()
                }),
            ) {
                log::error!("✗ Failed to emit deeplink-error event: {emit_err}");
            }
        }
    }

    true
}

#[cfg(target_os = "macos")]
fn macos_tray_icon() -> Option<tauri::image::Image<'static>> {
    const ICON_BYTES: &[u8] = include_bytes!("../icons/tray/macos/statusbar_template_3x.png");

    match tauri::image::Image::from_bytes(ICON_BYTES) {
        Ok(icon) => Some(icon),
        Err(err) => {
            log::warn!("Failed to load macOS tray icon: {err}");
            None
        }
    }
}

fn is_chinese_locale() -> bool {
    std::env::var("LANG")
        .or_else(|_| std::env::var("LC_ALL"))
        .or_else(|_| std::env::var("LC_MESSAGES"))
        .map(|lang| lang.starts_with("zh"))
        .unwrap_or(false)
}

fn show_migration_error_dialog(app: &tauri::AppHandle, error: &str) -> bool {
    let title = if is_chinese_locale() {
        "配置迁移失败"
    } else {
        "Migration Failed"
    };

    let message = if is_chinese_locale() {
        format!(
            "从旧版本迁移配置时发生错误：\n\n{error}\n\n\
            您的数据尚未丢失，旧配置文件仍然保留。\n\
            建议回退到旧版本以保护数据。\n\n\
            点击「重试」重新尝试迁移\n\
            点击「退出」关闭程序"
        )
    } else {
        format!(
            "An error occurred while migrating configuration:\n\n{error}\n\n\
            Your data is NOT lost - the old config file is still preserved.\n\
            Consider rolling back to an older version.\n\n\
            Click 'Retry' to attempt migration again\n\
            Click 'Exit' to close the program"
        )
    };

    let retry_text = if is_chinese_locale() { "重试" } else { "Retry" };
    let exit_text = if is_chinese_locale() { "退出" } else { "Exit" };

    app.dialog()
        .message(&message)
        .title(title)
        .kind(MessageDialogKind::Error)
        .buttons(MessageDialogButtons::OkCancelCustom(
            retry_text.to_string(),
            exit_text.to_string(),
        ))
        .blocking_show()
}

fn show_database_init_error_dialog(
    app: &tauri::AppHandle,
    db_path: &std::path::Path,
    error: &str,
) -> bool {
    let title = if is_chinese_locale() {
        "数据库初始化失败"
    } else {
        "Database Initialization Failed"
    };

    let message = if is_chinese_locale() {
        format!(
            "初始化数据库或迁移数据库结构时发生错误：\n\n{error}\n\n\
            数据库文件路径：\n{db}\n\n\
            点击「重试」重新尝试初始化\n\
            点击「退出」关闭程序",
            db = db_path.display()
        )
    } else {
        format!(
            "An error occurred while initializing the database:\n\n{error}\n\n\
            Database file path:\n{db}\n\n\
            Click 'Retry' to attempt initialization again\n\
            Click 'Exit' to close the program",
            db = db_path.display()
        )
    };

    let retry_text = if is_chinese_locale() { "重试" } else { "Retry" };
    let exit_text = if is_chinese_locale() { "退出" } else { "Exit" };

    app.dialog()
        .message(&message)
        .title(title)
        .kind(MessageDialogKind::Error)
        .buttons(MessageDialogButtons::OkCancelCustom(
            retry_text.to_string(),
            exit_text.to_string(),
        ))
        .blocking_show()
}

async fn cleanup_before_exit(app_handle: &tauri::AppHandle) {
    if let Some(state) = app_handle.try_state::<cc_switch::store::AppState>() {
        let proxy_service = &state.proxy_service;

        let has_backups = match state.db.has_any_live_backup().await {
            Ok(v) => v,
            Err(e) => {
                log::error!("退出时检查 Live 备份失败: {e}");
                false
            }
        };
        let live_taken_over = proxy_service.detect_takeover_in_live_configs();
        let needs_restore = has_backups || live_taken_over;

        if needs_restore {
            log::info!("检测到接管残留，开始恢复 Live 配置...");
            if let Err(e) = proxy_service.stop_with_restore_keep_state().await {
                log::error!("退出时恢复 Live 配置失败: {e}");
            } else {
                log::info!("已恢复 Live 配置");
            }
            return;
        }

        if proxy_service.is_running().await {
            log::info!("检测到代理服务器正在运行，开始停止...");
            if let Err(e) = proxy_service.stop().await {
                log::error!("退出时停止代理失败: {e}");
            }
            log::info!("代理服务器清理完成");
        }
    }
}

async fn restore_proxy_state_on_startup(state: &cc_switch::store::AppState) {
    let mut apps_to_restore = Vec::new();
    for app_type in ["claude", "codex", "gemini"] {
        if let Ok(config) = state.db.get_proxy_config_for_app(app_type).await {
            if config.enabled {
                apps_to_restore.push(app_type);
            }
        }
    }

    if apps_to_restore.is_empty() {
        log::debug!("启动时无需恢复代理状态");
        return;
    }

    log::info!("检测到上次代理状态需要恢复，应用列表: {apps_to_restore:?}");

    for app_type in apps_to_restore {
        match state
            .proxy_service
            .set_takeover_for_app(app_type, true)
            .await
        {
            Ok(()) => {
                log::info!("✓ 已恢复 {app_type} 的代理接管状态");
            }
            Err(e) => {
                log::error!("✗ 恢复 {app_type} 的代理接管状态失败: {e}");
                if let Err(clear_err) = state
                    .proxy_service
                    .set_takeover_for_app(app_type, false)
                    .await
                {
                    log::error!("清除 {app_type} 代理状态失败: {clear_err}");
                }
            }
        }
    }
}

// ============================================================
// Main Application Entry Point
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Setup panic hook for crash logging
    cc_switch::panic_hook::setup_panic_hook();

    let mut builder = tauri::Builder::default();

    // Single instance plugin (all desktop platforms)
    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            log::info!("=== Single Instance Callback Triggered ===");

            let mut found_deeplink = false;
            for arg in &args {
                if handle_deeplink_url(app, arg, false, "single_instance args") {
                    found_deeplink = true;
                    break;
                }
            }

            if !found_deeplink {
                log::info!("ℹ No deep link URL found in args");
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    let builder = builder
        .plugin(tauri_plugin_deep_link::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let settings = cc_switch::settings::get_settings();

                if settings.minimize_to_tray_on_close {
                    api.prevent_close();
                    let _ = window.hide();
                    #[cfg(target_os = "windows")]
                    {
                        let _ = window.set_skip_taskbar(true);
                    }
                    #[cfg(target_os = "macos")]
                    {
                        cc_switch::tray::apply_tray_policy(window.app_handle(), false);
                    }
                } else {
                    window.app_handle().exit(0);
                }
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Initialize app config directory override
            cc_switch::app_store::refresh_app_config_dir_override(app.handle());
            cc_switch::panic_hook::init_app_config_dir(cc_switch::config::get_app_config_dir());

            // Initialize updater plugin
            #[cfg(desktop)]
            {
                if let Err(e) = app
                    .handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())
                {
                    log::warn!("初始化 Updater 插件失败，已跳过：{e}");
                }
            }

            // Initialize logging
            {
                use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

                let log_dir = cc_switch::panic_hook::get_log_dir();

                if let Err(e) = std::fs::create_dir_all(&log_dir) {
                    eprintln!("创建日志目录失败: {e}");
                }

                let log_file_path = log_dir.join("cavin-tools.log");
                let _ = std::fs::remove_file(&log_file_path);

                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Trace)
                        .targets([
                            Target::new(TargetKind::Stdout),
                            Target::new(TargetKind::Folder {
                                path: log_dir,
                                file_name: Some("cavin-tools".into()),
                            }),
                        ])
                        .rotation_strategy(RotationStrategy::KeepSome(2))
                        .max_file_size(1024 * 1024 * 1024)
                        .timezone_strategy(TimezoneStrategy::UseLocal)
                        .build(),
                )?;
            }

            // Initialize CC Switch database
            let app_config_dir = cc_switch::config::get_app_config_dir();
            let db_path = app_config_dir.join("cavin-tools.db");
            let json_path = app_config_dir.join("config.json");

            let has_json = json_path.exists();
            let has_db = db_path.exists();

            let migration_config = if !has_db && has_json {
                log::info!("检测到旧版配置文件，验证配置文件...");

                loop {
                    match cc_switch::app_config::MultiAppConfig::load() {
                        Ok(config) => {
                            log::info!("✓ 配置文件加载成功");
                            break Some(config);
                        }
                        Err(e) => {
                            log::error!("加载旧配置文件失败: {e}");
                            if !show_migration_error_dialog(app.handle(), &e.to_string()) {
                                log::info!("用户选择退出程序");
                                std::process::exit(1);
                            }
                            log::info!("用户选择重试加载配置文件");
                        }
                    }
                }
            } else {
                None
            };

            let db = loop {
                match cc_switch::database::Database::init() {
                    Ok(db) => break Arc::new(db),
                    Err(e) => {
                        log::error!("Failed to init database: {e}");

                        if !show_database_init_error_dialog(app.handle(), &db_path, &e.to_string())
                        {
                            log::info!("用户选择退出程序");
                            std::process::exit(1);
                        }

                        log::info!("用户选择重试初始化数据库");
                    }
                }
            };

            if let Some(config) = migration_config {
                log::info!("开始执行数据迁移...");

                match db.migrate_from_json(&config) {
                    Ok(_) => {
                        log::info!("✓ 配置迁移成功");
                        cc_switch::init_status::set_migration_success();
                        let archive_path = json_path.with_extension("json.migrated");
                        if let Err(e) = std::fs::rename(&json_path, &archive_path) {
                            log::warn!("归档旧配置文件失败: {e}");
                        } else {
                            log::info!("✓ 旧配置已归档为 config.json.migrated");
                        }
                    }
                    Err(e) => {
                        log::error!("配置迁移失败: {e}");
                    }
                }
            }

            let app_state = AppState::new(db);

            app_state
                .proxy_service
                .set_app_handle(app.handle().clone());

            // Initialize default skill repos
            match app_state.db.init_default_skill_repos() {
                Ok(count) if count > 0 => {
                    log::info!("✓ Initialized {count} default skill repositories");
                }
                Ok(_) => {}
                Err(e) => log::warn!("✗ Failed to initialize default skill repos: {e}"),
            }

            // Import providers for each app type
            for app_type in [
                cc_switch::app_config::AppType::Claude,
                cc_switch::app_config::AppType::Codex,
                cc_switch::app_config::AppType::Gemini,
            ] {
                match cc_switch::services::provider::ProviderService::import_default_config(
                    &app_state,
                    app_type.clone(),
                ) {
                    Ok(true) => {
                        log::info!("✓ Imported default provider for {}", app_type.as_str());
                    }
                    Ok(false) => {}
                    Err(e) => {
                        log::debug!(
                            "○ No default provider to import for {}: {}",
                            app_type.as_str(),
                            e
                        );
                    }
                }
            }

            // Import MCP servers if table is empty
            if app_state.db.is_mcp_table_empty().unwrap_or(false) {
                log::info!("MCP table empty, importing from live configurations...");

                let _ = cc_switch::services::mcp::McpService::import_from_claude(&app_state);
                let _ = cc_switch::services::mcp::McpService::import_from_codex(&app_state);
                let _ = cc_switch::services::mcp::McpService::import_from_gemini(&app_state);
                let _ = cc_switch::services::mcp::McpService::import_from_opencode(&app_state);
            }

            // Register deep-link handler
            log::info!("=== Registering deep-link URL handler ===");

            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                if let Err(e) = app.deep_link().register_all() {
                    log::error!("✗ Failed to register deep link schemes: {}", e);
                } else {
                    log::info!("✓ Deep link schemes registered");
                }
            }

            app.deep_link().on_open_url({
                let app_handle = app.handle().clone();
                move |event| {
                    log::info!("=== Deep Link Event Received ===");
                    let urls = event.urls();

                    for (i, url) in urls.iter().enumerate() {
                        let url_str = url.as_str();
                        log::debug!("  URL[{i}]: {}", redact_url_for_log(url_str));

                        if handle_deeplink_url(&app_handle, url_str, true, "on_open_url") {
                            break;
                        }
                    }
                }
            });
            log::info!("✓ Deep-link URL handler registered");

            // Create tray menu
            let menu = cc_switch::tray::create_tray_menu(app.handle(), &app_state)?;

            let mut tray_builder = TrayIconBuilder::with_id("main")
                .on_tray_icon_event(|_tray, event| match event {
                    TrayIconEvent::Click { .. } => {}
                    _ => log::debug!("unhandled tray event {event:?}"),
                })
                .menu(&menu)
                .on_menu_event(|app, event| {
                    cc_switch::tray::handle_tray_menu_event(app, &event.id.0);
                })
                .show_menu_on_left_click(true);

            #[cfg(target_os = "macos")]
            {
                if let Some(icon) = macos_tray_icon() {
                    tray_builder = tray_builder.icon(icon).icon_as_template(true);
                } else if let Some(icon) = app.default_window_icon() {
                    tray_builder = tray_builder.icon(icon.clone());
                }
            }

            #[cfg(not(target_os = "macos"))]
            {
                if let Some(icon) = app.default_window_icon() {
                    tray_builder = tray_builder.icon(icon.clone());
                }
            }

            let _tray = tray_builder.build(app)?;
            app.manage(app_state);

            // Load log config
            {
                let db = &app.state::<AppState>().db;
                if let Ok(log_config) = db.get_log_config() {
                    log::set_max_level(log_config.to_level_filter());
                }
            }

            // Initialize SkillService
            let skill_service = SkillService::new();
            app.manage(cc_switch::commands::skill::SkillServiceState(Arc::new(
                skill_service,
            )));

            // Initialize global proxy HTTP client
            {
                let db = &app.state::<AppState>().db;
                let proxy_url = db.get_global_proxy_url().ok().flatten();

                if let Err(e) = cc_switch::proxy::http_client::init(proxy_url.as_deref()) {
                    log::error!("[GlobalProxy] Failed to initialize: {e}");

                    if proxy_url.is_some() {
                        let _ = db.set_global_proxy_url(None);
                    }

                    let _ = cc_switch::proxy::http_client::init(None);
                }
            }

            // Restore proxy state on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = app_handle.state::<AppState>();

                let has_backups = match state.db.has_any_live_backup().await {
                    Ok(v) => v,
                    Err(e) => {
                        log::error!("检查 Live 备份失败: {e}");
                        false
                    }
                };
                let live_taken_over = state.proxy_service.detect_takeover_in_live_configs();

                if has_backups || live_taken_over {
                    log::warn!("检测到上次异常退出，正在恢复 Live 配置...");
                    if let Err(e) = state.proxy_service.recover_from_crash().await {
                        log::error!("恢复 Live 配置失败: {e}");
                    } else {
                        log::info!("Live 配置已恢复");
                    }
                }

                restore_proxy_state_on_startup(&state).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ============================================================
            // Mnemosyne Commands (Video/Image Processing)
            // ============================================================
            check_ffmpeg,
            download_ffmpeg,
            generate_thumbnails,
            load_video,
            compress_video_command,
            change_video_speed,
            extract_frames,
            trim_video,
            convert_to_gif,
            process_operation_queue,
            get_image_info,
            convert_image,
            batch_convert_images,
            remove_watermark,
            batch_remove_watermarks,
            check_bg_model_status,
            download_bg_model,
            remove_image_background,
            batch_remove_image_backgrounds,
            get_processes,
            search_processes,
            kill_process_command,
            query_port_command,
            kill_port_command,
            query_ports_by_pid_command,
            updater::check_update,
            updater::download_and_install_update,
            // ============================================================
            // CC Switch Commands (AI Assistant)
            // ============================================================
            cc_switch::commands::get_providers,
            cc_switch::commands::get_current_provider,
            cc_switch::commands::add_provider,
            cc_switch::commands::update_provider,
            cc_switch::commands::delete_provider,
            cc_switch::commands::remove_provider_from_live_config,
            cc_switch::commands::switch_provider,
            cc_switch::commands::import_default_config,
            cc_switch::commands::get_claude_config_status,
            cc_switch::commands::get_config_status,
            cc_switch::commands::get_claude_code_config_path,
            cc_switch::commands::get_config_dir,
            cc_switch::commands::open_config_folder,
            cc_switch::commands::pick_directory,
            cc_switch::commands::open_external,
            cc_switch::commands::get_init_error,
            cc_switch::commands::get_migration_result,
            cc_switch::commands::get_skills_migration_result,
            cc_switch::commands::get_app_config_path,
            cc_switch::commands::open_app_config_folder,
            cc_switch::commands::get_claude_common_config_snippet,
            cc_switch::commands::set_claude_common_config_snippet,
            cc_switch::commands::get_common_config_snippet,
            cc_switch::commands::set_common_config_snippet,
            cc_switch::commands::extract_common_config_snippet,
            cc_switch::commands::read_live_provider_settings,
            cc_switch::commands::get_settings,
            cc_switch::commands::save_settings,
            cc_switch::commands::get_rectifier_config,
            cc_switch::commands::set_rectifier_config,
            cc_switch::commands::get_log_config,
            cc_switch::commands::set_log_config,
            cc_switch::commands::restart_app,
            cc_switch::commands::check_for_updates,
            cc_switch::commands::is_portable_mode,
            cc_switch::commands::get_claude_plugin_status,
            cc_switch::commands::read_claude_plugin_config,
            cc_switch::commands::apply_claude_plugin_config,
            cc_switch::commands::is_claude_plugin_applied,
            cc_switch::commands::apply_claude_onboarding_skip,
            cc_switch::commands::clear_claude_onboarding_skip,
            cc_switch::commands::get_claude_mcp_status,
            cc_switch::commands::read_claude_mcp_config,
            cc_switch::commands::upsert_claude_mcp_server,
            cc_switch::commands::delete_claude_mcp_server,
            cc_switch::commands::validate_mcp_command,
            cc_switch::commands::queryProviderUsage,
            cc_switch::commands::testUsageScript,
            cc_switch::commands::get_mcp_config,
            cc_switch::commands::upsert_mcp_server_in_config,
            cc_switch::commands::delete_mcp_server_in_config,
            cc_switch::commands::set_mcp_enabled,
            cc_switch::commands::get_mcp_servers,
            cc_switch::commands::upsert_mcp_server,
            cc_switch::commands::delete_mcp_server,
            cc_switch::commands::toggle_mcp_app,
            cc_switch::commands::import_mcp_from_apps,
            cc_switch::commands::get_prompts,
            cc_switch::commands::upsert_prompt,
            cc_switch::commands::delete_prompt,
            cc_switch::commands::enable_prompt,
            cc_switch::commands::import_prompt_from_file,
            cc_switch::commands::get_current_prompt_file_content,
            cc_switch::commands::test_api_endpoints,
            cc_switch::commands::get_custom_endpoints,
            cc_switch::commands::add_custom_endpoint,
            cc_switch::commands::remove_custom_endpoint,
            cc_switch::commands::update_endpoint_last_used,
            cc_switch::commands::get_app_config_dir_override,
            cc_switch::commands::set_app_config_dir_override,
            cc_switch::commands::update_providers_sort_order,
            cc_switch::commands::export_config_to_file,
            cc_switch::commands::import_config_from_file,
            cc_switch::commands::save_file_dialog,
            cc_switch::commands::open_file_dialog,
            cc_switch::commands::sync_current_providers_live,
            cc_switch::commands::parse_deeplink,
            cc_switch::commands::merge_deeplink_config,
            cc_switch::commands::import_from_deeplink,
            cc_switch::commands::import_from_deeplink_unified,
            update_tray_menu,
            cc_switch::commands::check_env_conflicts,
            cc_switch::commands::delete_env_vars,
            cc_switch::commands::restore_env_backup,
            cc_switch::commands::get_installed_skills,
            cc_switch::commands::install_skill_unified,
            cc_switch::commands::uninstall_skill_unified,
            cc_switch::commands::toggle_skill_app,
            cc_switch::commands::scan_unmanaged_skills,
            cc_switch::commands::import_skills_from_apps,
            cc_switch::commands::discover_available_skills,
            cc_switch::commands::get_skills,
            cc_switch::commands::get_skills_for_app,
            cc_switch::commands::install_skill,
            cc_switch::commands::install_skill_for_app,
            cc_switch::commands::uninstall_skill,
            cc_switch::commands::uninstall_skill_for_app,
            cc_switch::commands::get_skill_repos,
            cc_switch::commands::add_skill_repo,
            cc_switch::commands::remove_skill_repo,
            cc_switch::commands::set_auto_launch,
            cc_switch::commands::get_auto_launch_status,
            cc_switch::commands::start_proxy_server,
            cc_switch::commands::stop_proxy_with_restore,
            cc_switch::commands::get_proxy_takeover_status,
            cc_switch::commands::set_proxy_takeover_for_app,
            cc_switch::commands::get_proxy_status,
            cc_switch::commands::get_proxy_config,
            cc_switch::commands::update_proxy_config,
            cc_switch::commands::get_global_proxy_config,
            cc_switch::commands::update_global_proxy_config,
            cc_switch::commands::get_proxy_config_for_app,
            cc_switch::commands::update_proxy_config_for_app,
            cc_switch::commands::is_proxy_running,
            cc_switch::commands::is_live_takeover_active,
            cc_switch::commands::switch_proxy_provider,
            cc_switch::commands::get_provider_health,
            cc_switch::commands::reset_circuit_breaker,
            cc_switch::commands::get_circuit_breaker_config,
            cc_switch::commands::update_circuit_breaker_config,
            cc_switch::commands::get_circuit_breaker_stats,
            cc_switch::commands::get_failover_queue,
            cc_switch::commands::get_available_providers_for_failover,
            cc_switch::commands::add_to_failover_queue,
            cc_switch::commands::remove_from_failover_queue,
            cc_switch::commands::get_auto_failover_enabled,
            cc_switch::commands::set_auto_failover_enabled,
            cc_switch::commands::get_usage_summary,
            cc_switch::commands::get_usage_trends,
            cc_switch::commands::get_provider_stats,
            cc_switch::commands::get_model_stats,
            cc_switch::commands::get_request_logs,
            cc_switch::commands::get_request_detail,
            cc_switch::commands::get_model_pricing,
            cc_switch::commands::update_model_pricing,
            cc_switch::commands::delete_model_pricing,
            cc_switch::commands::check_provider_limits,
            cc_switch::commands::stream_check_provider,
            cc_switch::commands::stream_check_all_providers,
            cc_switch::commands::get_stream_check_config,
            cc_switch::commands::save_stream_check_config,
            cc_switch::commands::get_tool_versions,
            cc_switch::commands::open_provider_terminal,
            cc_switch::commands::get_universal_providers,
            cc_switch::commands::get_universal_provider,
            cc_switch::commands::upsert_universal_provider,
            cc_switch::commands::delete_universal_provider,
            cc_switch::commands::sync_universal_provider,
            cc_switch::commands::import_opencode_providers_from_live,
            cc_switch::commands::get_opencode_live_provider_ids,
            cc_switch::commands::get_global_proxy_url,
            cc_switch::commands::set_global_proxy_url,
            cc_switch::commands::test_proxy_url,
            cc_switch::commands::get_upstream_proxy_status,
            cc_switch::commands::scan_local_proxies,
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { api, .. } = &event {
            log::info!("收到退出请求，开始清理...");
            api.prevent_exit();

            let app_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                cleanup_before_exit(&app_handle).await;
                log::info!("清理完成，退出应用");

                tokio::time::sleep(std::time::Duration::from_millis(100)).await;

                std::process::exit(0);
            });
            return;
        }

        #[cfg(target_os = "macos")]
        {
            match event {
                RunEvent::Reopen { .. } => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                        cc_switch::tray::apply_tray_policy(app_handle, true);
                    }
                }
                RunEvent::Opened { urls } => {
                    if let Some(url) = urls.first() {
                        let url_str = url.to_string();
                        if url_str.starts_with("ccswitch://") {
                            handle_deeplink_url(app_handle, &url_str, true, "RunEvent::Opened");
                        }
                    }
                }
                _ => {}
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = (app_handle, event);
        }
    });
}
