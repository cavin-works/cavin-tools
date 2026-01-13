/**
 * 图片处理模块
 *
 * 所有图片处理功能的 Rust 后端实现
 */

pub mod info;
pub mod crop;
pub mod rotate;
pub mod flip;
pub mod resize;
pub mod watermark;
pub mod collage;
pub mod batch;
pub mod convert;
pub mod mosaic;

// 重新导出常用类型
pub use info::{get_image_info, ImageInfo};

use serde::{Deserialize, Serialize};

/**
 * 图片处理错误类型
 */
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageError {
    pub message: String,
    pub error_type: String,
}

impl From<image::ImageError> for ImageError {
    fn from(err: image::ImageError) -> Self {
        ImageError {
            message: err.to_string(),
            error_type: "ImageError".to_string(),
        }
    }
}

impl From<std::io::Error> for ImageError {
    fn from(err: std::io::Error) -> Self {
        ImageError {
            message: err.to_string(),
            error_type: "IoError".to_string(),
        }
    }
}
