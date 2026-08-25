pub mod layout;
pub mod types;

use base64::Engine;
use image::{
    codecs::jpeg::JpegEncoder, codecs::webp::{WebPEncoder, WebPQuality}, imageops, DynamicImage,
    GenericImageView, ImageFormat, Rgba, RgbaImage,
};
use tokio::task::spawn_blocking;

pub use types::CollageParams;

/// 拼贴渲染核心：按布局把图片合成到画布上。
/// 布局在原图尺寸域计算；scale < 1 时画布与单元格（含 gap/margin）整体等比缩小，
/// 保证预览与导出的几何一致。返回 Rgba 画布。
fn render_collage(imgs: &[DynamicImage], params: &CollageParams, scale: f64) -> Result<RgbaImage, String> {
    let sizes: Vec<(u32, u32)> = imgs.iter().map(|i| i.dimensions()).collect();
    let (canvas_w, canvas_h, rects) = layout::cell_rects(&params.template, &sizes, params)?;

    let scaled = |v: u32| -> u32 { ((v as f64 * scale).round() as u32).max(1) };
    let mut canvas = RgbaImage::from_pixel(scaled(canvas_w), scaled(canvas_h), layout::background_color(&params.background));

    // 网格模板单元格统一尺寸，用裁剪填充；行/列模板目标即原比例，直接拉伸到精确尺寸
    let fill = params.template.starts_with("grid");
    let filter = image::imageops::FilterType::Lanczos3;
    // scaled 的 .max(1) 会把 0 变 1，圆角为 0 时保持 0 以跳过蒙版
    let radius = if params.corner_radius == 0 { 0 } else { scaled(params.corner_radius) };

    for (img, rect) in imgs.iter().zip(&rects) {
        let (tw, th) = (scaled(rect.width), scaled(rect.height));
        let resized = if fill {
            img.resize_to_fill(tw, th, filter)
        } else {
            img.resize_exact(tw, th, filter)
        };
        let mut cell = resized.to_rgba8();
        if radius > 0 {
            cell = rounded_corners(&cell, radius);
        }
        let x = (rect.x as f64 * scale).round() as i64;
        let y = (rect.y as f64 * scale).round() as i64;
        imageops::overlay(&mut canvas, &cell, x, y);
    }

    Ok(canvas)
}

/// 圆角蒙版：返回等大新图，四角圆外的像素 alpha 置 0，圆内/边中/中心原样。
/// radius 钳位到 min(w,h)/2；按像素中心到角圆心的距离判定（像素中心即 x+0.5, y+0.5）。
fn rounded_corners(img: &RgbaImage, radius: u32) -> RgbaImage {
    let (w, h) = img.dimensions();
    let radius = radius.min(w.min(h) / 2) as f64;
    let mut out = img.clone();
    if radius == 0.0 {
        return out;
    }
    let (fw, fh) = (w as f64, h as f64);
    for y in 0..h {
        for x in 0..w {
            let (px, py) = (x as f64 + 0.5, y as f64 + 0.5);
            // 超出直边深入角区的横向/纵向距离，0 表示不在角区
            let dx = if px < radius { radius - px } else if px > fw - radius { px - (fw - radius) } else { 0.0 };
            let dy = if py < radius { radius - py } else if py > fh - radius { py - (fh - radius) } else { 0.0 };
            if dx > 0.0 && dy > 0.0 && dx * dx + dy * dy > radius * radius {
                out.get_pixel_mut(x, y).0[3] = 0;
            }
        }
    }
    out
}

/// 生成拼贴预览：布局在原图域计算后整体缩放至最长边 600px，返回 PNG base64 data URL
pub async fn collage_preview(
    input_paths: Vec<String>,
    params: CollageParams,
) -> Result<String, String> {
    spawn_blocking(move || {
        if input_paths.is_empty() {
            return Err("拼贴至少需要一张图片".to_string());
        }

        let imgs: Vec<DynamicImage> = input_paths
            .iter()
            .map(|p| image::open(p).map_err(|e| format!("无法打开图片 {}: {}", p, e)))
            .collect::<Result<_, _>>()?;

        let sizes: Vec<(u32, u32)> = imgs.iter().map(|i| i.dimensions()).collect();
        let (canvas_w, canvas_h, _) = layout::cell_rects(&params.template, &sizes, &params)?;
        let scale = (600.0 / canvas_w.max(canvas_h) as f64).min(1.0);

        let canvas = render_collage(&imgs, &params, scale)?;

        let mut buffer = std::io::Cursor::new(Vec::new());
        canvas
            .write_to(&mut buffer, ImageFormat::Png)
            .map_err(|e| format!("编码预览图失败: {}", e))?;

        Ok(format!(
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(buffer.into_inner())
        ))
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}

/// 导出拼贴结果：scale=1 全分辨率，按指定格式写入输出路径，返回实际输出路径
pub async fn collage_export(
    input_paths: Vec<String>,
    params: CollageParams,
    output_path: String,
    format: String,
    quality: u8,
) -> Result<String, String> {
    spawn_blocking(move || {
        if input_paths.is_empty() {
            return Err("拼贴至少需要一张图片".to_string());
        }

        let imgs: Vec<DynamicImage> = input_paths
            .iter()
            .map(|p| image::open(p).map_err(|e| format!("无法打开图片 {}: {}", p, e)))
            .collect::<Result<_, _>>()?;

        let mut canvas = render_collage(&imgs, &params, 1.0)?;

        match format.to_lowercase().as_str() {
            "jpg" | "jpeg" => {
                // JPEG 不支持透明通道，拍平到 RGB；透明背景需先合成到白底，
                // 否则 to_rgb8 丢弃 alpha 后透明区域落黑
                if params.background == "transparent" {
                    let mut white = RgbaImage::from_pixel(
                        canvas.width(),
                        canvas.height(),
                        Rgba([255, 255, 255, 255]),
                    );
                    imageops::overlay(&mut white, &canvas, 0, 0);
                    canvas = white;
                }
                let mut output_file = std::fs::File::create(&output_path)
                    .map_err(|e| format!("创建输出文件失败: {}", e))?;
                let encoder = JpegEncoder::new_with_quality(&mut output_file, quality);
                DynamicImage::ImageRgba8(canvas)
                    .to_rgb8()
                    .write_with_encoder(encoder)
                    .map_err(|e| format!("保存JPEG失败: {}", e))?;
            }
            "webp" => {
                // 有损 WebP 才有质量参数（libwebp，quality 0-100 越大质量越高）
                let mut output_file = std::fs::File::create(&output_path)
                    .map_err(|e| format!("创建输出文件失败: {}", e))?;
                #[allow(deprecated)] // 0.24 将 lossy 构造标记 deprecated，质量参数仅此路径可用
                let encoder =
                    WebPEncoder::new_with_quality(&mut output_file, WebPQuality::lossy(quality));
                canvas
                    .write_with_encoder(encoder)
                    .map_err(|e| format!("保存WebP失败: {}", e))?;
            }
            _ => {
                DynamicImage::ImageRgba8(canvas)
                    .save_with_format(&output_path, ImageFormat::Png)
                    .map_err(|e| format!("保存PNG失败: {}", e))?;
            }
        }

        Ok(output_path)
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn solid(w: u32, h: u32) -> RgbaImage {
        RgbaImage::from_pixel(w, h, Rgba([200, 100, 50, 255]))
    }

    #[test]
    fn test_rounded_corners_4x4_radius2() {
        let out = rounded_corners(&solid(4, 4), 2);
        assert_eq!(out.dimensions(), (4, 4));
        // 四角圆外透明
        for (x, y) in [(0, 0), (3, 0), (0, 3), (3, 3)] {
            assert_eq!(out.get_pixel(x, y).0[3], 0, "角 ({x},{y}) 应透明");
        }
        // 边中与中心保持不透明
        for (x, y) in [
            (1, 0), (2, 0), (0, 1), (0, 2), (3, 1), (3, 2), (1, 3), (2, 3),
            (1, 1), (1, 2), (2, 1), (2, 2),
        ] {
            assert_eq!(out.get_pixel(x, y).0[3], 255, "边中/中心 ({x},{y}) 应保持不透明");
        }
    }

    #[test]
    fn test_rounded_corners_zero_identity() {
        let img = solid(7, 5);
        assert_eq!(rounded_corners(&img, 0), img);
    }

    #[test]
    fn test_rounded_corners_radius_clamped() {
        let img = solid(4, 4);
        // 超大半径钳位到 min(w,h)/2 = 2，与 radius=2 结果一致，且不越界
        assert_eq!(rounded_corners(&img, 64), rounded_corners(&img, 2));
        assert_eq!(rounded_corners(&img, u32::MAX), rounded_corners(&img, 2));
    }
}
