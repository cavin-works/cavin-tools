// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

// 导出ffmpeg模块
pub mod ffmpeg;
pub mod models;

#[derive(Debug, Serialize, Deserialize)]
struct GreetArgs {
    name: String,
}

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! 来自Tauri的问候!", name)
}

/// 检查FFmpeg是否可用
///
/// # Returns
/// 返回FFmpeg的可用性信息和路径
#[tauri::command]
async fn check_ffmpeg() -> Result<ffmpeg::FfmpegInfo, String> {
    ffmpeg::check_ffmpeg_available()
}

/// 加载视频并获取元数据
///
/// # Arguments
/// * path - 视频文件的完整路径
///
/// # Returns
/// 返回视频的详细信息
#[tauri::command]
async fn load_video(path: String) -> Result<models::VideoInfo, String> {
    ffmpeg::get_video_info(path).await
}

/// 打开文件选择对话框
///
/// # Returns
/// 返回选中的视频文件路径,如果用户取消则返回None
#[tauri::command]
async fn open_file_dialog() -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    use tauri_plugin_dialog::FilePickerBuilder;

    // TODO: 需要在 Tauri 2.x 中正确实现文件对话框
    // 这需要使用 tauri-plugin-dialog 的 FilePickerBuilder
    // 暂时返回 None,等待 Tauri 2.x dialog API 稳定
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_ffmpeg,
            load_video,
            open_file_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
