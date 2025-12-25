use std::process::{Command, Stdio};
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SpeedParams {
    pub speed: f64,  // 0.25 - 4.0
    pub preserve_pitch: bool,
}

/// 改变视频播放速度
///
/// # Arguments
/// * input_path - 输入视频文件路径
/// * output_path - 输出视频文件路径
/// * params - 速度参数
pub async fn change_video_speed(
    input_path: String,
    output_path: String,
    params: SpeedParams,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        let mut cmd = Command::new(&ffmpeg_path);

        // 计算速度因子
        let video_speed = 1.0 / params.speed;

        cmd.arg("-i").arg(&input_path);

        // 视频速度
        cmd.arg("-filter:v")
            .arg(format!("setpts={}*PTS", video_speed));

        // 音频速度
        if !params.preserve_pitch {
            // atempo只支持0.5到2.0,需要链式调用
            let mut speed = params.speed;
            let mut filters = Vec::new();

            while speed > 2.0 {
                filters.push("atempo=2.0".to_string());
                speed /= 2.0;
            }

            while speed < 0.5 {
                filters.push("atempo=0.5".to_string());
                speed *= 2.0;
            }

            if speed >= 0.5 && speed <= 2.0 {
                filters.push(format!("atempo={}", speed));
            }

            if !filters.is_empty() {
                cmd.arg("-filter:a").arg(filters.join(","));
            }
        }

        cmd.arg("-y").arg(&output_path);

        let output = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("变速失败: {}", error));
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
