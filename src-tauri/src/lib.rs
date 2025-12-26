// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::Emitter;

// 导出ffmpeg模块
pub mod ffmpeg;
pub mod models;

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
    // TODO: 需要在 Tauri 2.x 中正确实现文件对话框
    // 这需要使用 tauri-plugin-dialog 的 FileDialogBuilder
    // 暂时返回 None,等待 Tauri 2.x dialog API 稳定
    None
}

/// 压缩视频
#[tauri::command]
async fn compress_video_command(
    input_path: String,
    params: ffmpeg::CompressParams,
    window: tauri::Window,
) -> Result<String, String> {
    // 生成输出路径
    let input_path_obj = std::path::Path::new(&input_path);
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}_compressed.{}", filename, extension);

    let window_clone = window.clone();
    ffmpeg::compress_video(input_path, output_path.clone(), params, move |progress| {
        let _ = window_clone.emit("progress", progress);
    }).await?;

    Ok(output_path)
}

/// 改变视频速度
#[tauri::command]
async fn change_video_speed(
    input_path: String,
    params: ffmpeg::SpeedParams,
) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}_speed_{}x.{}", filename, params.speed, extension);

    ffmpeg::change_video_speed(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

/// 提取视频帧
#[tauri::command]
async fn extract_frames(
    input_path: String,
    params: ffmpeg::ExtractParams,
) -> Result<Vec<String>, String> {
    ffmpeg::extract_frames(input_path, params).await
}

/// 截断视频
#[tauri::command]
async fn trim_video(
    input_path: String,
    params: ffmpeg::TrimParams,
) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}_trimmed.{}", filename, extension);

    ffmpeg::trim_video(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

/// 转换为GIF
#[tauri::command]
async fn convert_to_gif(
    input_path: String,
    params: ffmpeg::GifParams,
) -> Result<String, String> {
    let input_path_obj = std::path::Path::new(&input_path);
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    let output_path = format!("{}.gif", filename);

    ffmpeg::convert_to_gif(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            check_ffmpeg,
            load_video,
            open_file_dialog,
            compress_video_command,
            change_video_speed,
            extract_frames,
            trim_video,
            convert_to_gif
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
