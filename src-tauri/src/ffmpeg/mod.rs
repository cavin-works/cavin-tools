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
        .ok_or_else(|| "未找到FFmpeg可执行文件".to_string())?;

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
