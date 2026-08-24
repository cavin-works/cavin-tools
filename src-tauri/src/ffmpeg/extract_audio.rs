use std::path::Path;
use std::process::{Command, Stdio};
use super::get_ffmpeg_path;

/// 根据音频格式与质量构造编码参数（纯函数，便于单测）
fn audio_codec_args(format: &str, quality: Option<u8>) -> Result<Vec<String>, String> {
    match format {
        "mp3" => Ok(vec![
            "-vn".to_string(),
            "-acodec".to_string(),
            "libmp3lame".to_string(),
            "-q:a".to_string(),
            quality.unwrap_or(4).min(9).to_string(),
        ]),
        "m4a" => Ok(vec![
            "-vn".to_string(),
            "-acodec".to_string(),
            "aac".to_string(),
            "-b:a".to_string(),
            format!("{}k", (quality.unwrap_or(6) as u32) * 32),
        ]),
        "wav" => Ok(vec![
            "-vn".to_string(),
            "-acodec".to_string(),
            "pcm_s16le".to_string(),
        ]),
        _ => Err(format!("不支持的音频格式: {}", format)),
    }
}

/// 提取视频音轨
///
/// # Arguments
/// * input_path - 输入视频文件路径
/// * format - 音频格式: mp3 / m4a / wav
/// * quality - mp3 为 0-9（越小质量越高），m4a 为码率基数（实际码率 = quality * 32k），wav 忽略
///
/// # Returns
/// 返回生成的音频文件路径（{stem}_audio.{ext}，写入源目录，已存在时自动追加 _1/_2…）
pub async fn extract_audio(
    input_path: String,
    format: String,
    quality: Option<u8>,
) -> Result<String, String> {
    let codec_args = audio_codec_args(&format, quality)?;

    let output_path = {
        let p = Path::new(&input_path);
        let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
        crate::unique_output_path(
            &p.parent()
                .unwrap_or_else(|| Path::new("."))
                .join(format!("{}_audio.{}", stem, format))
                .to_string_lossy(),
        )
    };

    tokio::task::spawn_blocking(move || {
        let ffmpeg_path = get_ffmpeg_path()
            .ok_or_else(|| "FFmpeg未找到".to_string())?;

        let mut cmd = Command::new(&ffmpeg_path);
        cmd.arg("-i").arg(&input_path);
        for arg in &codec_args {
            cmd.arg(arg);
        }
        cmd.arg("-y").arg(&output_path);

        let output = cmd
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("执行FFmpeg失败: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("提取音频失败: {}", error));
        }

        Ok::<String, String>(output_path)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mp3_args_with_quality() {
        let args = audio_codec_args("mp3", Some(2)).unwrap();
        assert_eq!(args, vec!["-vn", "-acodec", "libmp3lame", "-q:a", "2"]);
    }

    #[test]
    fn test_mp3_args_default_quality() {
        let args = audio_codec_args("mp3", None).unwrap();
        assert_eq!(args, vec!["-vn", "-acodec", "libmp3lame", "-q:a", "4"]);
    }

    #[test]
    fn test_m4a_args_with_quality() {
        let args = audio_codec_args("m4a", Some(4)).unwrap();
        assert_eq!(args, vec!["-vn", "-acodec", "aac", "-b:a", "128k"]);
    }

    #[test]
    fn test_m4a_args_default_quality() {
        let args = audio_codec_args("m4a", None).unwrap();
        assert_eq!(args, vec!["-vn", "-acodec", "aac", "-b:a", "192k"]);
    }

    #[test]
    fn test_wav_args_ignore_quality() {
        let args = audio_codec_args("wav", Some(9)).unwrap();
        assert_eq!(args, vec!["-vn", "-acodec", "pcm_s16le"]);
    }

    #[test]
    fn test_invalid_format() {
        assert!(audio_codec_args("flac", None).is_err());
    }
}
