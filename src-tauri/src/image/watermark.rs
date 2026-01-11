use super::ImageError;
use image::{DynamicImage, GenericImageView};
use image::imageops::{self, overlay, FilterType};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 水印类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WatermarkType {
    Text,
    Image,
}

/// 水印位置（九宫格）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum WatermarkPosition {
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
    Custom,
}

/// 文字水印参数（简化版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextWatermarkOptions {
    /// 文字内容
    pub text: String,
    /// 字体大小（像素）
    pub font_size: f32,
    /// 字体颜色（RGBA）
    pub color: String, // hex color with alpha
}

/// 图片水印参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageWatermarkOptions {
    /// 水印图片路径
    pub watermark_path: String,
    /// 缩放比例（0-1）
    pub scale: f32,
}

/// 水印参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatermarkParams {
    /// 水印类型
    pub r#type: WatermarkType,
    /// 位置
    pub position: WatermarkPosition,
    /// 自定义 X 坐标（仅当 position 为 Custom 时有效）
    pub x: Option<u32>,
    /// 自定义 Y 坐标（仅当 position 为 Custom 时有效）
    pub y: Option<u32>,
    /// 透明度（0-255）
    pub opacity: u8,
    /// 文字水印选项
    pub text_options: Option<TextWatermarkOptions>,
    /// 图片水印选项
    pub image_options: Option<ImageWatermarkOptions>,
}

/// 添加图片水印
fn add_image_watermark(
    base_image: &DynamicImage,
    params: &WatermarkParams,
) -> Result<DynamicImage, ImageError> {
    let image_options = params.image_options.as_ref().ok_or_else(|| ImageError {
        message: "缺少图片水印选项".to_string(),
        error_type: "ValidationError".to_string(),
    })?;

    // 加载水印图片
    let watermark_img = image::open(&image_options.watermark_path).map_err(|e| ImageError {
        message: format!("无法加载水印图片: {}", e),
        error_type: "ImageError".to_string(),
    })?;

    // 缩放水印图片
    let (wm_width, wm_height) = watermark_img.dimensions();
    let scaled_width = ((wm_width as f32 * image_options.scale) as u32).max(1);
    let scaled_height = ((wm_height as f32 * image_options.scale) as u32).max(1);

    let scaled_watermark = imageops::resize(
        &watermark_img,
        scaled_width,
        scaled_height,
        FilterType::Lanczos3,
    );

    // 转换为 RGBA DynamicImage
    let watermark_dynamic = DynamicImage::ImageRgba8(scaled_watermark);
    let mut watermark_rgba = watermark_dynamic.to_rgba8();
    let (wm_width, wm_height) = watermark_rgba.dimensions();

    // 应用透明度
    let opacity = params.opacity as f32 / 255.0;
    for pixel in watermark_rgba.pixels_mut() {
        let alpha = pixel[3] as f32 * opacity;
        pixel[3] = alpha.round().min(255.0) as u8;
    }

    // 创建基础图片的可变副本
    let mut base = base_image.to_rgba8();
    let (base_width, base_height) = base.dimensions();

    // 计算位置
    let (x, y) = calculate_position(
        base_width,
        base_height,
        wm_width,
        wm_height,
        &params.position,
        params.x,
        params.y,
    );

    // 叠加水印
    overlay(&mut base, &watermark_rgba, x as i64, y as i64);

    Ok(DynamicImage::ImageRgba8(base))
}

/// 简单的文字水印（使用图片生成）
fn add_simple_text_watermark(
    base_image: &DynamicImage,
    params: &WatermarkParams,
) -> Result<DynamicImage, ImageError> {
    // TODO: 实现简单的文字水印
    // 暂时返回未修改的图片
    Err(ImageError {
        message: "文字水印功能尚未实现，请使用图片水印".to_string(),
        error_type: "NotImplemented".to_string(),
    })
}

/// 计算水印位置
fn calculate_position(
    base_width: u32,
    base_height: u32,
    wm_width: u32,
    wm_height: u32,
    position: &WatermarkPosition,
    custom_x: Option<u32>,
    custom_y: Option<u32>,
) -> (u32, u32) {
    let padding = 10u32;

    match position {
        WatermarkPosition::TopLeft => (padding, padding),
        WatermarkPosition::TopCenter => {
            let x = base_width.saturating_sub(wm_width) / 2;
            (x, padding)
        }
        WatermarkPosition::TopRight => {
            let x = base_width.saturating_sub(wm_width + padding);
            (x.max(0), padding)
        }
        WatermarkPosition::CenterLeft => {
            let y = base_height.saturating_sub(wm_height) / 2;
            (padding, y)
        }
        WatermarkPosition::Center => {
            let x = base_width.saturating_sub(wm_width) / 2;
            let y = base_height.saturating_sub(wm_height) / 2;
            (x, y)
        }
        WatermarkPosition::CenterRight => {
            let x = base_width.saturating_sub(wm_width + padding);
            let y = base_height.saturating_sub(wm_height) / 2;
            (x.max(0), y)
        }
        WatermarkPosition::BottomLeft => {
            let y = base_height.saturating_sub(wm_height + padding);
            (padding, y.max(0))
        }
        WatermarkPosition::BottomCenter => {
            let x = base_width.saturating_sub(wm_width) / 2;
            let y = base_height.saturating_sub(wm_height + padding);
            (x, y.max(0))
        }
        WatermarkPosition::BottomRight => {
            let x = base_width.saturating_sub(wm_width + padding);
            let y = base_height.saturating_sub(wm_height + padding);
            (x.max(0), y.max(0))
        }
        WatermarkPosition::Custom => {
            let x = custom_x.unwrap_or(0);
            let y = custom_y.unwrap_or(0);
            (x, y)
        }
    }
}

/// 添加水印
pub fn add_watermark(
    input_path: String,
    output_path: String,
    params: WatermarkParams,
) -> Result<(), ImageError> {
    // 验证参数
    if params.r#type == WatermarkType::Text {
        // 文字水印暂不支持
        return add_simple_text_watermark(
            &image::open(&input_path).map_err(|e| ImageError {
                message: format!("无法打开图片: {}", e),
                error_type: "ImageError".to_string(),
            })?,
            &params,
        ).and_then(|img| {
            let output_extension = Path::new(&output_path)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("png");

            img.save(&output_path).map_err(|e| ImageError {
                message: format!("保存图片失败: {}", e),
                error_type: "IoError".to_string(),
            })
        });
    }

    if params.r#type == WatermarkType::Image && params.image_options.is_none() {
        return Err(ImageError {
            message: "图片水印需要提供 image_options".to_string(),
            error_type: "ValidationError".to_string(),
        });
    }

    if params.position == WatermarkPosition::Custom && (params.x.is_none() || params.y.is_none()) {
        return Err(ImageError {
            message: "自定义位置需要提供 x 和 y 坐标".to_string(),
            error_type: "ValidationError".to_string(),
        });
    }

    // 加载原始图片
    let base_image = image::open(&input_path).map_err(|e| ImageError {
        message: format!("无法打开图片: {}", e),
        error_type: "ImageError".to_string(),
    })?;

    // 根据类型添加水印
    let result = add_image_watermark(&base_image, &params)?;

    // 保存结果
    result.save(&output_path).map_err(|e| ImageError {
        message: format!("保存图片失败: {}", e),
        error_type: "IoError".to_string(),
    })?;

    Ok(())
}
