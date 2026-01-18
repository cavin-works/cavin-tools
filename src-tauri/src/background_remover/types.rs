use serde::{Deserialize, Serialize};

/// 模型信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    /// 模型是否已下载
    pub downloaded: bool,
    /// 模型文件路径
    pub path: Option<String>,
    /// 模型文件大小（字节）
    pub size: Option<u64>,
    /// 模型版本
    pub version: String,
}

/// 模型下载进度
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    /// 已下载字节数
    pub downloaded: u64,
    /// 总字节数
    pub total: u64,
    /// 百分比 (0-100)
    pub percentage: f32,
    /// 下载状态
    pub status: DownloadStatus,
}

/// 下载状态枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DownloadStatus {
    /// 准备中
    Preparing,
    /// 下载中
    Downloading,
    /// 校验中
    Verifying,
    /// 完成
    Completed,
    /// 失败
    Failed,
}

/// 去背景参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveBackgroundParams {
    /// 输出格式 (png, webp)，默认 png
    #[serde(default = "default_output_format")]
    pub output_format: String,

    /// 是否返回 Base64 编码的结果（用于预览）
    #[serde(default)]
    pub return_base64: bool,

    /// 边缘羽化程度 (0-10)，默认 0
    #[serde(default)]
    pub feather: u8,

    /// 背景颜色（可选，格式：#RRGGBB 或 transparent）
    pub background_color: Option<String>,
}

fn default_output_format() -> String {
    "png".to_string()
}

impl Default for RemoveBackgroundParams {
    fn default() -> Self {
        Self {
            output_format: "png".to_string(),
            return_base64: false,
            feather: 0,
            background_color: None,
        }
    }
}

/// 去背景结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveBackgroundResult {
    /// 输出文件路径
    pub output_path: String,
    /// 原始文件大小（字节）
    pub original_size: u64,
    /// 处理后文件大小（字节）
    pub processed_size: u64,
    /// 处理耗时（毫秒）
    pub processing_time_ms: u64,
    /// Base64 编码的结果（如果 return_base64 为 true）
    pub base64_data: Option<String>,
    /// 原始尺寸
    pub original_dimensions: Dimensions,
}

/// 图片尺寸
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dimensions {
    pub width: u32,
    pub height: u32,
}
