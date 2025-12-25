use std::process::{Command, Stdio};
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TrimParams {
    pub start_time: f64,  // 秒
    pub end_time: f64,    // 秒
    pub precise: bool,    // 是否精确截断(重新编码)
}

/// 截断视频
///
/// # Arguments
/// * input_path - 输入视频文件路径
/// * output_path - 输出视频文件路径
/// * params - 截断参数
pub async fn trim_video(
    input_path: String,
    output_path: String,
    params: TrimParams,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        let mut cmd = Command::new(&ffmpeg_path);

        cmd.arg("-ss").arg(&params.start_time.to_string());
        cmd.arg("-to").arg(&params.end_time.to_string());
        cmd.arg("-i").arg(&input_path);

        if params.precise {
            // 精确截断,重新编码
            cmd.arg("-c:v").arg("libx264");
            cmd.arg("-c:a").arg("aac");
        } else {
            // 快速截断,流复制
            cmd.arg("-c").arg("copy");
        }

        cmd.arg("-y").arg(&output_path);

        let output = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("截断失败: {}", error));
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
