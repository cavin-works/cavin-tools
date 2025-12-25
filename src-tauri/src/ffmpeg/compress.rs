use std::process::{Command, Stdio};
use std::path::PathBuf;
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CompressParams {
    pub preset: String,  // mobile, web, high_quality, custom
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub bitrate: Option<u32>,  // kbps
    pub crf: Option<u32>,  // 0-51
    pub codec: Option<String>,  // h264, h265, vp9
    pub fps: Option<u32>,
}

/// 压缩视频
///
/// # Arguments
/// * input_path - 输入视频文件路径
/// * output_path - 输出视频文件路径
/// * params - 压缩参数
/// * on_progress - 进度回调函数 (0.0-100.0)
pub async fn compress_video(
    input_path: String,
    output_path: String,
    params: CompressParams,
    on_progress: impl Fn(f64) + Send + 'static,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        let mut cmd = Command::new(&ffmpeg_path);

        // 输入文件
        cmd.arg("-i").arg(&input_path);

        // 视频编码器
        let codec = params.codec.as_ref().map(|s| s.as_str()).unwrap_or("libx264");
        match codec {
            "h265" => cmd.arg("-c:v").arg("libx265"),
            "vp9" => cmd.arg("-c:v").arg("libvpx-vp9"),
            _ => cmd.arg("-c:v").arg("libx264"),
        };

        // 分辨率
        if let Some(w) = params.width {
            if let Some(h) = params.height {
                cmd.arg("-vf").arg(format!("scale={}:{}", w, h));
            }
        }

        // 帧率
        if let Some(fps) = params.fps {
            cmd.arg("-r").arg(fps.to_string());
        }

        // CRF质量控制
        let preset_crf = match params.preset.as_str() {
            "mobile" => 26,
            "web" => 30,
            "high_quality" => 23,
            _ => params.crf.unwrap_or(23),
        };
        cmd.arg("-crf").arg(preset_crf.to_string());

        // 预设速度
        cmd.arg("-preset").arg("medium");

        // 比特率
        if let Some(bitrate) = params.bitrate {
            cmd.arg("-b:v").arg(format!("{}k", bitrate));
        }

        // 音频编码
        cmd.arg("-c:a").arg("aac");
        cmd.arg("-b:a").arg("128k");

        // 输出文件
        cmd.arg("-y").arg(&output_path);

        // 执行命令
        let output = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("压缩失败: {}", error));
        }

        on_progress(100.0);
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
