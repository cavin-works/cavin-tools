use std::process::{Command, Stdio};
use std::path::{Path, PathBuf};
use super::get_ffmpeg_path;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ExtractParams {
    pub mode: String,  // single, interval, uniform
    pub format: String,  // jpg, png, webp
    pub quality: u32,  // 1-100
    pub interval: Option<f64>,  // 秒
    pub count: Option<u32>,  // 帧数
    pub output_dir: String,
}

/// 提取视频帧
///
/// # Arguments
/// * input_path - 输入视频文件路径
/// * params - 提取参数
///
/// # Returns
/// 返回生成的图片文件路径列表
pub async fn extract_frames(
    input_path: String,
    params: ExtractParams,
) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        // 确保输出目录存在
        std::fs::create_dir_all(&params.output_dir)
            .map_err(|e| format!("创建输出目录失败: {}", e))?;

        let output_pattern = Path::new(&params.output_dir)
            .join(format!("frame_%04d.{}", params.format))
            .to_string_lossy()
            .to_string();

        let mut cmd = Command::new(&ffmpeg_path);
        cmd.arg("-i").arg(&input_path);

        match params.mode.as_str() {
            "single" => {
                // 提取单帧(默认第5秒)
                cmd.arg("-ss").arg("00:00:05");
                cmd.arg("-vframes").arg("1");

                // 单帧模式使用特殊输出路径
                let single_output = Path::new(&params.output_dir)
                    .join(format!("frame.{}", params.format))
                    .to_string_lossy()
                    .to_string();
                cmd.arg("-y").arg(&single_output);

                let output = cmd
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .output()
                    .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

                if !output.status.success() {
                    return Err("提取帧失败".to_string());
                }

                return Ok(vec![single_output]);
            }
            "interval" => {
                // 间隔提取
                let interval = params.interval.unwrap_or(1.0);
                cmd.arg("-vf").arg(format!("fps=1/{}", interval));
            }
            "uniform" => {
                // 均匀提取N帧
                let count = params.count.unwrap_or(10);
                cmd.arg("-vf").arg(format!("select='eq(n,0)+gt(mod(n,{}),{})'",
                    count, count - 1));
            }
            _ => return Err("无效的提取模式".to_string()),
        }

        // 质量设置
        match params.format.as_str() {
            "jpg" | "jpeg" => {
                cmd.arg("-q:v").arg((100 - params.quality).to_string());
            }
            "png" => {
                // PNG使用compression级别
                cmd.arg("-compression_level").arg("9");
            }
            "webp" => {
                cmd.arg("-quality").arg(params.quality.to_string());
            }
            _ => {}
        }

        cmd.arg("-y").arg(&output_pattern);

        let output = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

        if !output.status.success() {
            return Err("提取帧失败".to_string());
        }

        // 查找生成的文件
        let files = std::fs::read_dir(&params.output_dir)
            .map_err(|e| format!("读取输出目录失败: {}", e))?
            .filter_map(|entry| entry.ok())
            .map(|entry| entry.path().to_string_lossy().to_string())
            .filter(|path| path.ends_with(&params.format))
            .collect();

        Ok::<Vec<String>, String>(files)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
