/**
 * 图片信息获取
 */

use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::path::Path;

use super::ImageError;

/**
 * 图片信息结构
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInfo {
    pub path: String,
    pub filename: String,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub file_size: u64,
    pub color_space: String,
    pub has_alpha: bool,
}

/**
 * 获取图片信息
 */
pub fn get_image_info(path: String) -> Result<ImageInfo, ImageError> {
    let path_obj = Path::new(&path);

    // 检查文件是否存在
    if !path_obj.exists() {
        return Err(ImageError {
            message: format!("文件不存在: {}", path),
            error_type: "FileNotFound".to_string(),
        });
    }

    // 获取文件大小
    let file_size = std::fs::metadata(&path)?.len();

    // 获取文件名
    let filename = path_obj
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // 打开图片并获取信息
    let img = image::open(&path)?;
    let (width, height) = img.dimensions();
    let color = img.color();
    let has_alpha = color.has_alpha();

    // 获取格式 - 从扩展名推断
    let format_str = path_obj
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("unknown")
        .to_uppercase();

    // 确定色彩空间
    let color_space = if has_alpha {
        "RGBA".to_string()
    } else {
        "RGB".to_string()
    };

    Ok(ImageInfo {
        path,
        filename,
        width,
        height,
        format: format_str,
        file_size,
        color_space,
        has_alpha,
    })
}
