use serde::{Deserialize, Serialize};

/// 转换参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertParams {
    /// 目标格式 (png, jpg, webp, gif, bmp, tiff, ico)
    pub target_format: String,
    /// 质量参数 (1-100, 仅用于 JPEG/WebP)
    pub quality: Option<u8>,
    /// 尺寸调整参数
    pub resize: Option<ResizeParams>,
    /// 是否保留元数据
    pub preserve_metadata: bool,
}

/// 尺寸调整参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeParams {
    /// 目标宽度
    pub width: Option<u32>,
    /// 目标高度
    pub height: Option<u32>,
    /// 是否保持宽高比
    pub maintain_aspect_ratio: bool,
}

/// 转换结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertResult {
    /// 输出文件路径
    pub output_path: String,
    /// 原始文件大小（字节）
    pub original_size: u64,
    /// 转换后文件大小（字节）
    pub converted_size: u64,
    /// 压缩率（百分比）
    pub compression_ratio: f32,
}
