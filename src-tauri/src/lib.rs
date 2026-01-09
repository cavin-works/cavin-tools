// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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

/// 下载FFmpeg到应用目录
///
/// # Returns
/// 返回下载的FFmpeg路径
#[tauri::command]
async fn download_ffmpeg() -> Result<String, String> {
    ffmpeg::download_ffmpeg().await
}

/// 生成视频缩略图条纹
///
/// # Arguments
/// * input_path - 视频文件路径
/// * count - 提取的缩略图数量
/// * start_index - 起始索引（可选，用于增量生成）
/// * total_count - 总缩略图数量（可选，用于计算时间位置）
///
/// # Returns
/// 返回缩略图的 base64 编码列表
#[tauri::command]
async fn generate_thumbnails(
    input_path: String,
    count: usize,
    start_index: Option<usize>,
    total_count: Option<usize>,
) -> Result<Vec<String>, String> {
    ffmpeg::generate_thumbnails(input_path, count, start_index, total_count).await
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

/// 压缩视频
#[tauri::command]
async fn compress_video_command(
    input_path: String,
    params: ffmpeg::CompressParams,
    window: tauri::Window,
) -> Result<String, String> {
    // 生成输出路径 - 保存到原视频同目录
    let input_path_obj = std::path::Path::new(&input_path);
    let parent_dir = input_path_obj.parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}\\{}_compressed.{}", parent_dir, filename, extension);

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
    let parent_dir = input_path_obj.parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}\\{}_speed_{}x.{}", parent_dir, filename, params.speed, extension);

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
    let parent_dir = input_path_obj.parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = input_path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4");

    let output_path = format!("{}\\{}_trimmed.{}", parent_dir, filename, extension);

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
    let parent_dir = input_path_obj.parent()
        .and_then(|p| p.to_str())
        .unwrap_or(".");
    let filename = input_path_obj.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    let output_path = format!("{}\\{}.gif", parent_dir, filename);

    ffmpeg::convert_to_gif(input_path, output_path.clone(), params).await?;

    Ok(output_path)
}

/// 处理操作队列 - 串联执行所有操作，只返回最终输出文件
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

    // 处理队列
    let process_result = async {
        for (index, operation) in operations.iter().enumerate() {
        let is_last = index == total_operations - 1;
        let output_path = if is_last {
            // 最后一个操作：生成永久输出文件
            let input_path_obj = std::path::Path::new(&input_path);
            let parent_dir = input_path_obj.parent()
                .unwrap_or(std::path::Path::new("."));
            let filename = input_path_obj.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output");
            let extension = match operation.operation_type.as_str() {
                "to_gif" => "gif",
                _ => input_path_obj.extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("mp4")
            };
            // 使用跨平台路径拼接
            parent_dir.join(format!("{}_final.{}", filename, extension))
                .to_str()
                .unwrap()
                .to_string()
        } else {
            // 中间操作：使用临时文件，需要添加扩展名以便 FFmpeg 识别格式
            let extension = match operation.operation_type.as_str() {
                "to_gif" => "gif",
                _ => input_path
                    .split('.')
                    .last()
                    .unwrap_or("mp4")
            };
            // 创建带扩展名的临时文件
            let temp_file = NamedTempFile::new()
                .map_err(|e| format!("创建临时文件失败: {}", e))?;
            let temp_path_with_ext = temp_file.path()
                .with_extension(extension);
            // 先 keep 防止自动删除
            let temp_path_kept = temp_file.into_temp_path()
                .keep()
                .map_err(|e| format!("保持临时文件失败: {}", e))?;
            // 重命名添加扩展名
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
                ffmpeg::compress_video(current_path.clone(), output_path.clone(), params, move |progress| {
                    let _ = window_clone.emit("progress", progress);
                }).await?;
            }
            "speed" => {
                let params = serde_json::from_value(operation.params.clone())
                    .map_err(|e| format!("解析变速参数失败: {}", e))?;
                ffmpeg::change_video_speed(current_path.clone(), output_path.clone(), params).await?;
            }
            "trim" => {
                let params = serde_json::from_value(operation.params.clone())
                    .map_err(|e| format!("解析截断参数失败: {}", e))?;
                ffmpeg::trim_video(current_path.clone(), output_path.clone(), params).await?;
            }
            "to_gif" => {
                let params = serde_json::from_value(operation.params.clone())
                    .map_err(|e| format!("解析GIF参数失败: {}", e))?;
                ffmpeg::convert_to_gif(current_path.clone(), output_path.clone(), params).await?;
            }
            "extract_frames" => {
                // 提取帧操作不产生视频输出，跳过
                continue;
            }
            _ => {
                return Err(format!("未知的操作类型: {}", operation.operation_type));
            }
        }

        current_path = output_path;
    }

    // 删除所有临时文件（除了最后一个）
    for temp_file in temp_files.iter().take(temp_files.len() - 1) {
        let _ = std::fs::remove_file(temp_file);
    }

    // 返回最终输出文件路径
    Ok(current_path)
    }.await;

    // 如果处理失败，清理所有临时文件
    match process_result {
        Ok(final_path) => Ok(final_path),
        Err(error) => {
            // 清理所有临时文件
            for temp_file in &temp_files {
                let _ = std::fs::remove_file(temp_file);
            }
            Err(error)
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            check_ffmpeg,
            download_ffmpeg,
            generate_thumbnails,
            load_video,
            compress_video_command,
            change_video_speed,
            extract_frames,
            trim_video,
            convert_to_gif,
            process_operation_queue
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
