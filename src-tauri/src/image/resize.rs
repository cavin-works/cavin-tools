use super::ImageError;
use image::{GenericImageView, imageops::{self, FilterType}};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 插值算法类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ResizeType {
    Nearest,    // 邻近插值
    Triangle,   // 双线性插值
    CatmullRom, // 双三次插值
    Gaussian,   // 高斯插值
    Lanczos3,   // Lanczos3插值
}

impl ResizeType {
    pub fn to_filter_type(&self) -> FilterType {
        match self {
            ResizeType::Nearest => FilterType::Nearest,
            ResizeType::Triangle => FilterType::Triangle,
            ResizeType::CatmullRom => FilterType::CatmullRom,
            ResizeType::Gaussian => FilterType::Gaussian,
            ResizeType::Lanczos3 => FilterType::Lanczos3,
        }
    }
}

/// 尺寸调整参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResizeParams {
    /// 目标宽度（像素）
    pub width: Option<u32>,
    /// 目标高度（像素）
    pub height: Option<u32>,
    /// 百分比缩放（1-100）
    pub percentage: Option<f32>,
    /// 是否保持宽高比
    pub maintain_aspect: bool,
    /// 插值算法
    pub algorithm: ResizeType,
}

/// 预设尺寸
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetSize {
    pub name: String,
    pub width: u32,
    pub height: u32,
}

impl ResizeParams {
    /// 验证参数有效性
    fn validate(&self) -> Result<(), ImageError> {
        // 检查是否至少提供一种调整方式
        if self.width.is_none() && self.height.is_none() && self.percentage.is_none() {
            return Err(ImageError {
                message: "必须指定宽度、高度或百分比".to_string(),
                error_type: "ValidationError".to_string(),
            });
        }

        // 验证百分比范围
        if let Some(p) = self.percentage {
            if p <= 0.0 || p > 1000.0 {
                return Err(ImageError {
                    message: format!("百分比必须在 1-1000 之间，当前: {}", p),
                    error_type: "ValidationError".to_string(),
                });
            }
        }

        // 验证宽度范围
        if let Some(w) = self.width {
            if w == 0 || w > 65536 {
                return Err(ImageError {
                    message: format!("宽度必须在 1-65536 之间，当前: {}", w),
                    error_type: "ValidationError".to_string(),
                });
            }
        }

        // 验证高度范围
        if let Some(h) = self.height {
            if h == 0 || h > 65536 {
                return Err(ImageError {
                    message: format!("高度必须在 1-65536 之间，当前: {}", h),
                    error_type: "ValidationError".to_string(),
                });
            }
        }

        Ok(())
    }

    /// 计算目标尺寸
    fn calculate_target_size(&self, original_width: u32, original_height: u32) -> (u32, u32) {
        // 如果使用百分比缩放
        if let Some(percentage) = self.percentage {
            let scale = percentage / 100.0;
            return (
                (original_width as f32 * scale).round() as u32,
                (original_height as f32 * scale).round() as u32,
            );
        }

        let width = self.width;
        let height = self.height;

        match (width, height) {
            (Some(w), Some(h)) => {
                if self.maintain_aspect {
                    // 保持宽高比：以限制较大的一边
                    let width_ratio = w as f32 / original_width as f32;
                    let height_ratio = h as f32 / original_height as f32;
                    let ratio = width_ratio.min(height_ratio);

                    (
                        (original_width as f32 * ratio).round() as u32,
                        (original_height as f32 * ratio).round() as u32,
                    )
                } else {
                    (w, h)
                }
            }
            (Some(w), None) => {
                // 只指定宽度，根据宽高比计算高度
                if self.maintain_aspect {
                    let ratio = w as f32 / original_width as f32;
                    (w, (original_height as f32 * ratio).round() as u32)
                } else {
                    (w, original_height)
                }
            }
            (None, Some(h)) => {
                // 只指定高度，根据宽高比计算宽度
                if self.maintain_aspect {
                    let ratio = h as f32 / original_height as f32;
                    ((original_width as f32 * ratio).round() as u32, h)
                } else {
                    (original_width, h)
                }
            }
            (None, None) => (original_width, original_height),
        }
    }
}

/// 调整图片尺寸
pub fn resize_image(
    input_path: String,
    output_path: String,
    params: ResizeParams,
) -> Result<(), ImageError> {
    // 验证参数
    params.validate()?;

    // 打开原始图片
    let img = image::open(&input_path).map_err(|e| ImageError {
        message: format!("无法打开图片: {}", e),
        error_type: "ImageError".to_string(),
    })?;

    let (original_width, original_height) = img.dimensions();

    // 计算目标尺寸
    let (target_width, target_height) = params.calculate_target_size(original_width, original_height);

    // 如果尺寸没有变化，直接复制文件
    if target_width == original_width && target_height == original_height {
        std::fs::copy(&input_path, &output_path).map_err(|e| ImageError {
            message: format!("复制文件失败: {}", e),
            error_type: "IoError".to_string(),
        })?;
        return Ok(());
    }

    // 获取插值算法
    let filter = params.algorithm.to_filter_type();

    // 执行缩放
    let resized = imageops::resize(&img, target_width, target_height, filter);

    // 保存结果
    let output_extension = Path::new(&output_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");

    resized.save(&output_path).map_err(|e| ImageError {
        message: format!("保存图片失败: {}", e),
        error_type: "IoError".to_string(),
    })?;

    Ok(())
}

/// 获取常用预设尺寸
pub fn get_preset_sizes() -> Vec<PresetSize> {
    vec![
        PresetSize {
            name: "4K".to_string(),
            width: 3840,
            height: 2160,
        },
        PresetSize {
            name: "1080p (FHD)".to_string(),
            width: 1920,
            height: 1080,
        },
        PresetSize {
            name: "720p (HD)".to_string(),
            width: 1280,
            height: 720,
        },
        PresetSize {
            name: "480p".to_string(),
            width: 854,
            height: 480,
        },
        PresetSize {
            name: "Instagram Square".to_string(),
            width: 1080,
            height: 1080,
        },
        PresetSize {
            name: "Instagram Portrait".to_string(),
            width: 1080,
            height: 1350,
        },
        PresetSize {
            name: "Instagram Landscape".to_string(),
            width: 1080,
            height: 608,
        },
        PresetSize {
            name: "微信头像".to_string(),
            width: 300,
            height: 300,
        },
        PresetSize {
            name: "微信朋友圈".to_string(),
            width: 1280,
            height: 1280,
        },
        PresetSize {
            name: "Twitter Header".to_string(),
            width: 1500,
            height: 500,
        },
        PresetSize {
            name: "Facebook Cover".to_string(),
            width: 820,
            height: 312,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_size_with_percentage() {
        let params = ResizeParams {
            width: None,
            height: None,
            percentage: Some(50.0),
            maintain_aspect: false,
            algorithm: ResizeType::Lanczos3,
        };

        let (w, h) = params.calculate_target_size(1920, 1080);
        assert_eq!(w, 960);
        assert_eq!(h, 540);
    }

    #[test]
    fn test_calculate_size_with_width_only() {
        let params = ResizeParams {
            width: Some(1280),
            height: None,
            percentage: None,
            maintain_aspect: true,
            algorithm: ResizeType::Lanczos3,
        };

        let (w, h) = params.calculate_target_size(1920, 1080);
        assert_eq!(w, 1280);
        assert_eq!(h, 720); // 1080 * (1280/1920) = 720
    }

    #[test]
    fn test_calculate_size_with_both_dimensions() {
        let params = ResizeParams {
            width: Some(1280),
            height: Some(720),
            percentage: None,
            maintain_aspect: false,
            algorithm: ResizeType::Lanczos3,
        };

        let (w, h) = params.calculate_target_size(1920, 1080);
        assert_eq!(w, 1280);
        assert_eq!(h, 720);
    }
}
