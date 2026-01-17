use image::DynamicImage;
use super::types::WatermarkInfo;

/// 根据图片尺寸检测水印参数
///
/// Gemini 水印规则：
/// - 宽 > 1024 且 高 > 1024：使用 96×96 水印，64px 边距
/// - 其他情况：使用 48×48 水印，32px 边距
pub fn detect_watermark_params(img: &DynamicImage) -> WatermarkInfo {
    let width = img.width();
    let height = img.height();

    let (watermark_size, margin) = if width > 1024 && height > 1024 {
        (96u32, 64u32)
    } else {
        (48u32, 32u32)
    };

    // 计算水印区域位置（右下角）
    let region_x = width.saturating_sub(watermark_size + margin);
    let region_y = height.saturating_sub(watermark_size + margin);

    WatermarkInfo {
        detected: true,
        watermark_size,
        region_x,
        region_y,
        margin_right: margin,
        margin_bottom: margin,
    }
}

/// 根据手动指定的尺寸计算水印参数
pub fn calculate_watermark_params(width: u32, height: u32, size: u32) -> WatermarkInfo {
    let margin = if size == 96 { 64 } else { 32 };

    let region_x = width.saturating_sub(size + margin);
    let region_y = height.saturating_sub(size + margin);

    WatermarkInfo {
        detected: true,
        watermark_size: size,
        region_x,
        region_y,
        margin_right: margin,
        margin_bottom: margin,
    }
}
