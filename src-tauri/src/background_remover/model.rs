use std::path::PathBuf;
use super::types::{ModelInfo, DownloadProgress, DownloadStatus};

// 模型下载 URL (Hugging Face)
const MODEL_URL: &str = "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx";
const MODEL_FILENAME: &str = "rmbg-1.4.onnx";
const MODEL_VERSION: &str = "1.4";
const MODEL_SIZE_BYTES: u64 = 176_000_000; // 约 176MB

/// 获取模型存储目录
pub fn get_model_dir() -> Result<PathBuf, String> {
    let model_dir = crate::cc_switch::config::get_models_dir();
    std::fs::create_dir_all(&model_dir)
        .map_err(|e| format!("创建模型目录失败: {}", e))?;
    Ok(model_dir)
}

/// 获取模型文件路径
pub fn get_model_path() -> Result<PathBuf, String> {
    Ok(get_model_dir()?.join(MODEL_FILENAME))
}

/// 检查模型状态
pub fn check_model_status() -> Result<ModelInfo, String> {
    let model_path = get_model_path()?;

    if model_path.exists() {
        let metadata = std::fs::metadata(&model_path)
            .map_err(|e| format!("读取模型文件信息失败: {}", e))?;

        Ok(ModelInfo {
            downloaded: true,
            path: Some(model_path.to_string_lossy().to_string()),
            size: Some(metadata.len()),
            version: MODEL_VERSION.to_string(),
        })
    } else {
        Ok(ModelInfo {
            downloaded: false,
            path: None,
            size: None,
            version: MODEL_VERSION.to_string(),
        })
    }
}

/// 下载模型（带进度回调）
pub async fn download_model<F>(
    progress_callback: F,
) -> Result<String, String>
where
    F: Fn(DownloadProgress) + Send + 'static,
{
    use futures_util::StreamExt;
    use std::io::Write;

    let model_path = get_model_path()?;

    // 如果已存在，直接返回
    if model_path.exists() {
        progress_callback(DownloadProgress {
            downloaded: MODEL_SIZE_BYTES,
            total: MODEL_SIZE_BYTES,
            percentage: 100.0,
            status: DownloadStatus::Completed,
        });
        return Ok(model_path.to_string_lossy().to_string());
    }

    // 确保目录存在
    get_model_dir()?;

    // 发送准备状态
    progress_callback(DownloadProgress {
        downloaded: 0,
        total: MODEL_SIZE_BYTES,
        percentage: 0.0,
        status: DownloadStatus::Preparing,
    });

    // 下载模型
    let client = reqwest::Client::new();
    let response = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("下载请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("下载失败，HTTP状态码: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(MODEL_SIZE_BYTES);

    // 创建临时文件
    let temp_path = model_path.with_extension("downloading");
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("下载数据失败: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("写入数据失败: {}", e))?;

        downloaded += chunk.len() as u64;
        let percentage = (downloaded as f32 / total_size as f32) * 100.0;

        progress_callback(DownloadProgress {
            downloaded,
            total: total_size,
            percentage,
            status: DownloadStatus::Downloading,
        });
    }

    // 确保所有数据写入磁盘
    file.flush().map_err(|e| format!("刷新文件缓冲区失败: {}", e))?;
    drop(file);

    // 校验
    progress_callback(DownloadProgress {
        downloaded: total_size,
        total: total_size,
        percentage: 100.0,
        status: DownloadStatus::Verifying,
    });

    // 重命名为正式文件
    std::fs::rename(&temp_path, &model_path)
        .map_err(|e| format!("重命名模型文件失败: {}", e))?;

    progress_callback(DownloadProgress {
        downloaded: total_size,
        total: total_size,
        percentage: 100.0,
        status: DownloadStatus::Completed,
    });

    Ok(model_path.to_string_lossy().to_string())
}

/// 删除模型文件
pub fn delete_model() -> Result<(), String> {
    let model_path = get_model_path()?;

    if model_path.exists() {
        std::fs::remove_file(&model_path)
            .map_err(|e| format!("删除模型文件失败: {}", e))?;
    }

    Ok(())
}
