use std::process::Command;
use super::get_ffmpeg_path;
use crate::models::VideoInfo;

/// 从FFmpeg输出解析视频信息
fn parse_ffmpeg_output(output: &str, path: String) -> Result<VideoInfo, String> {
    let mut duration = 0.0;
    let mut width = 0;
    let mut height = 0;
    let mut fps = 0.0;
    let mut codec = String::new();
    let mut bitrate = 0u64;
    let mut format = String::new();

    for line in output.lines() {
        // 解析时长
        if line.contains("Duration:") {
            let time_str = line.split("Duration:").nth(1)
                .ok_or("无法解析时长")?.trim();
            let parts: Vec<&str> = time_str.split(':').collect();
            if parts.len() >= 3 {
                let hours: f64 = parts[0].parse().unwrap_or(0.0);
                let minutes: f64 = parts[1].parse().unwrap_or(0.0);
                let seconds: f64 = parts[2].split(',').next().unwrap_or("0").parse().unwrap_or(0.0);
                duration = hours * 3600.0 + minutes * 60.0 + seconds;
            }
        }

        // 解析视频流信息
        if line.contains("Video:") {
            let info = line.split("Video:").nth(1).unwrap_or("");
            let parts: Vec<&str> = info.split_whitespace().collect();

            if parts.len() > 0 {
                codec = parts[0].to_string();
            }

            // 解析分辨率
            for part in &parts {
                if part.contains(&['x'][..]) && part.len() < 10 {
                    let dims: Vec<&str> = part.split('x').collect();
                    if dims.len() == 2 {
                        width = dims[0].parse().unwrap_or(0);
                        height = dims[1].parse().unwrap_or(0);
                    }
                }
            }

            // 解析帧率
            for part in &parts {
                if part.contains("fps") {
                    fps = part.replace("fps", "").trim().parse().unwrap_or(0.0);
                }
            }
        }

        // 解析比特率
        if line.contains("bitrate:") {
            let bitrate_str = line.split("bitrate:").nth(1).unwrap_or("");
            let bitrate_num = bitrate_str.split_whitespace().next().unwrap_or("0");
            bitrate = (bitrate_num.parse::<f64>().unwrap_or(0.0) * 1000.0) as u64;
        }
    }

    // 获取文件信息
    let path_obj = std::path::Path::new(&path);
    let filename = path_obj.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    let file_size = std::fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);
    let format = path_obj.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_uppercase();

    Ok(VideoInfo {
        path,
        filename,
        duration,
        width,
        height,
        fps,
        codec,
        bitrate,
        file_size,
        format,
    })
}

/// 获取视频信息
pub async fn get_video_info(path: String) -> Result<VideoInfo, String> {
    // 验证文件存在
    if !std::path::Path::new(&path).exists() {
        return Err("文件不存在".to_string());
    }

    let ffmpeg_path = get_ffmpeg_path()
        .ok_or_else(|| "未找到FFmpeg可执行文件".to_string())?;

    // 运行FFmpeg -i命令
    let output = Command::new(&ffmpeg_path)
        .arg("-i")
        .arg(&path)
        .output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    // FFmpeg将信息输出到stderr
    let stderr = String::from_utf8_lossy(&output.stderr);

    parse_ffmpeg_output(&stderr, path)
}
