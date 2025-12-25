use std::process::{Command, Stdio};
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct GifParams {
    pub start_time: f64,
    pub end_time: f64,
    pub fps: u32,
    pub width: u32,
    pub colors: u32,  // 2-256
    pub dither: bool,
}

/// 转换视频为GIF
///
/// # Arguments
/// * input_path - 输入视频文件路径
/// * output_path - 输出GIF文件路径
/// * params - GIF参数
pub async fn convert_to_gif(
    input_path: String,
    output_path: String,
    params: GifParams,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        let mut cmd = Command::new(&ffmpeg_path);

        cmd.arg("-ss").arg(&params.start_time.to_string());
        cmd.arg("-t").arg(&(params.end_time - params.start_time).to_string());
        cmd.arg("-i").arg(&input_path);

        // 构建filter_complex
        let dither_mode = if params.dither { "sierra2_4a" } else { "none" };
        let filters = format!(
            "fps={},scale={}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors={}:reserve_transparent=1[p];[s1][p]paletteuse=dither={}",
            params.fps,
            params.width,
            params.colors,
            dither_mode
        );

        cmd.arg("-filter_complex").arg(&filters);
        cmd.arg("-y").arg(&output_path);

        let output = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("转GIF失败: {}", error));
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
