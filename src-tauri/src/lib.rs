// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

// 导出ffmpeg模块
pub mod ffmpeg;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, check_ffmpeg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
