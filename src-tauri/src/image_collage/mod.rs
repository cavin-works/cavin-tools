pub mod layout;
pub mod types;

use base64::Engine;
use image::{codecs::jpeg::JpegEncoder, imageops, DynamicImage, GenericImageView, ImageFormat, RgbaImage};
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

    for (img, rect) in imgs.iter().zip(&rects) {
        let (tw, th) = (scaled(rect.width), scaled(rect.height));
        let resized = if fill {
            img.resize_to_fill(tw, th, filter)
        } else {
            img.resize_exact(tw, th, filter)
        };
        let x = (rect.x as f64 * scale).round() as i64;
        let y = (rect.y as f64 * scale).round() as i64;
        imageops::overlay(&mut canvas, &resized.to_rgba8(), x, y);
    }

    Ok(canvas)
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

/// 导出拼贴结果：scale=1 全分辨率，按指定格式写入输出路径
pub async fn collage_export(
    input_paths: Vec<String>,
    params: CollageParams,
    output_path: String,
    format: String,
    quality: u8,
) -> Result<(), String> {
    spawn_blocking(move || {
        if input_paths.is_empty() {
            return Err("拼贴至少需要一张图片".to_string());
        }

        let imgs: Vec<DynamicImage> = input_paths
            .iter()
            .map(|p| image::open(p).map_err(|e| format!("无法打开图片 {}: {}", p, e)))
            .collect::<Result<_, _>>()?;

        let canvas = render_collage(&imgs, &params, 1.0)?;
        let processed = DynamicImage::ImageRgba8(canvas);

        match format.to_lowercase().as_str() {
            "jpg" | "jpeg" => {
                // JPEG 不支持透明通道，先拍平到 RGB
                let mut output_file = std::fs::File::create(&output_path)
                    .map_err(|e| format!("创建输出文件失败: {}", e))?;
                let encoder = JpegEncoder::new_with_quality(&mut output_file, quality);
                processed
                    .to_rgb8()
                    .write_with_encoder(encoder)
                    .map_err(|e| format!("保存JPEG失败: {}", e))?;
            }
            "webp" => {
                processed
                    .save_with_format(&output_path, ImageFormat::WebP)
                    .map_err(|e| format!("保存WebP失败: {}", e))?;
            }
            _ => {
                processed
                    .save_with_format(&output_path, ImageFormat::Png)
                    .map_err(|e| format!("保存PNG失败: {}", e))?;
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}
