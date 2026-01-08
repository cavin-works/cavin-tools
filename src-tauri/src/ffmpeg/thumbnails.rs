use super::get_ffmpeg_path;
use std::process::{Command, Stdio};
use base64::Engine;

/// 生成视频缩略图
///
/// # Arguments
/// * input_path - 视频文件路径
/// * count - 提取的缩略图数量
/// * start_index - 起始索引（可选，用于增量生成）
/// * total_count - 总缩略图数量（用于计算时间位置，当 start_index 存在时必需）
///
/// # Returns
/// 返回缩略图的 base64 编码列表（JPEG格式）
pub async fn generate_thumbnails(
    input_path: String,
    count: usize,
    start_index: Option<usize>,
    total_count: Option<usize>,
) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        println!("开始生成缩略图: input={}, count={}", input_path, count);
        let mut thumbnails = Vec::new();

        // 首先获取视频时长
        let duration_output = Command::new(&ffmpeg_path)
            .args(["-i", &input_path, "-f", "null", "-"])
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("获取视频时长失败: {}", e))?;

        let duration_str = String::from_utf8_lossy(&duration_output.stderr);
        // 从FFmpeg输出中解析时长 (Duration: HH:MM:SS.MM)
        let duration = duration_str
            .lines()
            .find(|line| line.contains("Duration:"))
            .and_then(|line| {
                line.split("Duration: ")
                    .nth(1)
                    .and_then(|d| d.split_whitespace().next())
            })
            .ok_or_else(|| "无法解析视频时长".to_string())?;

        // 解析时长为秒数
        let parts: Vec<&str> = duration.split(':').collect();
        let total_seconds = if parts.len() >= 3 {
            parts[0].parse::<f64>().unwrap_or(0.0) * 3600.0
                + parts[1].parse::<f64>().unwrap_or(0.0) * 60.0
                + parts[2].parse::<f64>().unwrap_or(0.0)
        } else {
            return Err("无效的时长格式".to_string());
        };

        println!("视频时长: {} 秒", total_seconds);

        // 均匀提取帧
        // 确定用于计算时间位置的总数量
        let calc_count = total_count.unwrap_or(count);
        let start_idx = start_index.unwrap_or(0);

        // 使用更快的帧提取参数：-threads 0 多线程，-skip_frame nokey 只提取关键帧
        for i in 0..count {
            // 计算时间点（秒）- 使用绝对索引位置
            let abs_index = start_idx + i;
            let timestamp_sec = (abs_index as f64 / (calc_count - 1).max(1) as f64) * total_seconds;
            let timestamp = format!("{:.2}", timestamp_sec);

            if i == 0 {
                println!("提取第 {}-{} 帧，时间点: {} 秒", start_idx + 1, start_idx + count, timestamp);
            }

            // 使用FFmpeg提取单帧为JPEG，输出到stdout
            // 优化参数：-threads 0（自动多线程），-fast（快速编码），-q:v 5（适中质量）
            let output = Command::new(&ffmpeg_path)
                .args([
                    "-ss", &timestamp,  // 从指定时间点开始（秒）
                    "-i", &input_path,  // 输入文件
                    "-vframes", "1",    // 只提取一帧
                    "-q:v", "5",        // 适中质量JPEG (2-31，数字越小质量越高，5-8 足够预览)
                    "-threads", "0",    // 自动多线程处理
                    "-f", "image2pipe", // 输出到管道
                    "-vcodec", "mjpeg", // 使用MJPEG编码
                    "-"                 // 输出到stdout
                ])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

            if !output.status.success() {
                let error = String::from_utf8_lossy(&output.stderr);
                println!("FFmpeg 错误: {}", error);
                // 跳过无法提取的帧（可能超出视频时长）
                if error.contains("Output file is empty") || error.contains("Output file is empty") {
                    continue;
                }
                return Err(format!("提取缩略图失败: {}", error));
            }

            // 检查输出是否为空
            if output.stdout.is_empty() {
                println!("警告: 第 {} 帧输出为空", i + 1);
                continue;
            }

            // 将JPEG数据转换为base64
            let base64 = base64::engine::general_purpose::STANDARD.encode(&output.stdout);
            thumbnails.push(format!("data:image/jpeg;base64,{}", base64));
            println!("第 {} 帧提取成功，大小: {} bytes", i + 1, output.stdout.len());
        }

        println!("缩略图生成完成，共 {} 张", thumbnails.len());
        Ok(thumbnails)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
