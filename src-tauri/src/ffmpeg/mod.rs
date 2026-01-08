pub mod info;
pub mod compress;
pub mod speed;
pub mod extract;
pub mod trim;
pub mod gif;
pub mod thumbnails;

pub use info::get_video_info;
pub use thumbnails::generate_thumbnails;
pub use compress::{compress_video, CompressParams};
pub use speed::{change_video_speed, SpeedParams};
pub use extract::{extract_frames, ExtractParams};
pub use trim::{trim_video, TrimParams};
pub use gif::{convert_to_gif, GifParams};

use std::env;
use std::path::PathBuf;
use std::process::Command;

/// 查找系统FFmpeg可执行文件路径
///
/// # Returns
/// 返回找到的FFmpeg可执行文件的完整路径
///
/// # 查找策略
/// - Windows: 使用 `where` 命令查找系统PATH中的ffmpeg
/// - 回退: 如果系统PATH中找不到,尝试使用应用目录下的ffmpeg
pub fn get_ffmpeg_path() -> Option<PathBuf> {
    // 首先尝试从系统PATH中查找ffmpeg
    if let Some(path) = find_ffmpeg_in_path() {
        return Some(path);
    }

    // 回退到应用目录下的ffmpeg
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // 根据平台使用正确的可执行文件名
            let ffmpeg_name = if cfg!(windows) {
                "ffmpeg.exe"
            } else {
                "ffmpeg"
            };
            let ffmpeg_path = exe_dir.join(ffmpeg_name);
            if ffmpeg_path.exists() {
                return Some(ffmpeg_path);
            }
        }
    }

    None
}

/// 在系统PATH中查找ffmpeg
#[cfg(target_os = "windows")]
fn find_ffmpeg_in_path() -> Option<PathBuf> {
    let output = Command::new("where")
        .args(["ffmpeg"])
        .output()
        .ok()?;

    if output.status.success() {
        let path_str = String::from_utf8(output.stdout).ok()?;
        // `where` 命令可能返回多个路径,取第一个
        let first_line = path_str.lines().next()?;
        Some(PathBuf::from(first_line.trim()))
    } else {
        None
    }
}

/// 在系统PATH中查找ffmpeg
#[cfg(not(target_os = "windows"))]
fn find_ffmpeg_in_path() -> Option<PathBuf> {
    let output = Command::new("which")
        .args(["ffmpeg"])
        .output()
        .ok()?;

    if output.status.success() {
        let path_str = String::from_utf8(output.stdout).ok()?;
        Some(PathBuf::from(path_str.trim()))
    } else {
        None
    }
}

/// 检查FFmpeg是否可用
///
/// # Returns
/// 返回FFmpeg是否可用以及相关信息
///
/// # 检查内容
/// - 验证ffmpeg文件存在
/// - 测试运行 `ffmpeg -version` 命令
pub fn check_ffmpeg_available() -> Result<FfmpegInfo, String> {
    let ffmpeg_path = get_ffmpeg_path()
        .ok_or_else(|| "未找到FFmpeg可执行文件。请安装FFmpeg或让应用自动下载。".to_string())?;

    // 验证文件存在
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg文件不存在: {}", ffmpeg_path.display()));
    }

    // 测试运行 ffmpeg -version
    let output = Command::new(&ffmpeg_path)
        .args(["-version"])
        .output()
        .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

    let version_output = String::from_utf8_lossy(&output.stdout);

    // 解析版本信息
    let version = parse_ffmpeg_version(&version_output);

    Ok(FfmpegInfo {
        available: true,
        path: ffmpeg_path.to_string_lossy().to_string(),
        version,
        output: version_output.to_string(),
    })
}

/// 解析FFmpeg版本信息
fn parse_ffmpeg_version(output: &str) -> String {
    // FFmpeg版本输出格式: "ffmpeg version x.y.z ..."
    output
        .lines()
        .next()
        .and_then(|line| {
            line.split("version")
                .nth(1)
                .map(|v| {
                    v.split_whitespace()
                        .next()
                        .unwrap_or("unknown")
                        .to_string()
                })
        })
        .unwrap_or_else(|| "unknown".to_string())
}

/// FFmpeg信息结构体
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FfmpegInfo {
    /// FFmpeg是否可用
    pub available: bool,
    /// FFmpeg可执行文件路径
    pub path: String,
    /// FFmpeg版本号
    pub version: String,
    /// 完整的version命令输出
    pub output: String,
}

/// 获取应用资源目录（用于存放FFmpeg）
pub fn get_app_dir() -> Option<PathBuf> {
    env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|p| p.to_path_buf()))
}

/// 自动下载FFmpeg（仅Windows）
///
/// # Returns
/// 返回下载的FFmpeg路径
#[cfg(target_os = "windows")]
pub async fn download_ffmpeg() -> Result<String, String> {
    use std::fs::{self, File};
    use std::io::Write;

    let app_dir = get_app_dir()
        .ok_or_else(|| "无法获取应用目录".to_string())?;

    let ffmpeg_path = app_dir.join("ffmpeg.exe");

    // 如果已存在，直接返回
    if ffmpeg_path.exists() {
        return Ok(ffmpeg_path.to_string_lossy().to_string());
    }

    // 下载FFmpeg
    let download_url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";

    // 下载到临时文件
    let temp_zip = app_dir.join("ffmpeg.zip");

    println!("正在下载FFmpeg，请稍候...");
    let response = reqwest::get(download_url)
        .await
        .map_err(|e| format!("下载失败: {}", e))?;

    let zip_bytes = response.bytes()
        .await
        .map_err(|e| format!("读取下载内容失败: {}", e))?;

    // 保存zip文件
    let mut file = File::create(&temp_zip)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;
    file.write_all(&zip_bytes)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    drop(file);

    // 解压并提取ffmpeg.exe
    let mut ffmpeg_zip = zip::ZipArchive::new(File::open(&temp_zip)
        .map_err(|e| format!("打开zip文件失败: {}", e))?)
        .map_err(|e| format!("读取zip文件失败: {}", e))?;

    // 查找ffmpeg.exe
    for i in 0..ffmpeg_zip.len() {
        let mut file = ffmpeg_zip.by_index(i)
            .map_err(|e| format!("读取zip条目失败: {}", e))?;
        let path = file.enclosed_name().ok_or("无效的文件路径")?;

        if path.ends_with("bin/ffmpeg.exe") {
            let mut outfile = File::create(&ffmpeg_path)
                .map_err(|e| format!("创建ffmpeg.exe失败: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("写入ffmpeg.exe失败: {}", e))?;
            break;
        }
    }

    // 删除临时zip文件
    let _ = fs::remove_file(&temp_zip);

    if ffmpeg_path.exists() {
        Ok(ffmpeg_path.to_string_lossy().to_string())
    } else {
        Err("下载后未找到ffmpeg.exe".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_ffmpeg_path() {
        let path = get_ffmpeg_path();
        println!("FFmpeg path: {:?}", path);
    }

    #[test]
    fn test_check_ffmpeg_available() {
        match check_ffmpeg_available() {
            Ok(info) => {
                println!("FFmpeg available: {}", info.available);
                println!("FFmpeg path: {}", info.path);
                println!("FFmpeg version: {}", info.version);
            }
            Err(e) => {
                println!("FFmpeg check failed: {}", e);
            }
        }
    }
}
