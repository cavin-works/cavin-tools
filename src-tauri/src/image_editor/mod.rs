pub mod edit;
pub mod types;

use base64::Engine;
use image::{
    codecs::jpeg::JpegEncoder, codecs::webp::{WebPEncoder, WebPQuality}, imageops, DynamicImage,
    GenericImageView, ImageFormat, Rgba, RgbaImage,
};
use tokio::task::spawn_blocking;

pub use types::{Annotation, CropRect, EditParams, TextOverlay};

/// 预览参数按缩放比换算：裁剪坐标与标注坐标/线宽（sigma 由 apply_edits 内部按 scale 缩放）
fn scale_crop(params: &EditParams, scale: f64) -> EditParams {
    let mut scaled = params.clone();
    if let Some(crop) = &params.crop {
        scaled.crop = Some(CropRect {
            x: (crop.x as f64 * scale).round() as u32,
            y: (crop.y as f64 * scale).round() as u32,
            width: ((crop.width as f64 * scale).round() as u32).max(1),
            height: ((crop.height as f64 * scale).round() as u32).max(1),
        });
    }
    if !params.annotations.is_empty() {
        scaled.annotations = params
            .annotations
            .iter()
            .map(|a| Annotation {
                kind: a.kind.clone(),
                x: (a.x as f64 * scale).round() as u32,
                y: (a.y as f64 * scale).round() as u32,
                width: (a.width as f64 * scale).round() as u32,
                height: (a.height as f64 * scale).round() as u32,
                color: a.color.clone(),
                stroke: ((a.stroke as f64 * scale).round() as u32).max(1),
                flip: a.flip,
            })
            .collect();
    }
    // 文字 PNG 由前端按预览缩放比预渲染小号（保持 WYSIWYG），
    // 后端仅换算锚点坐标，PNG 本身不再缩放
    if !params.text_overlays.is_empty() {
        scaled.text_overlays = params
            .text_overlays
            .iter()
            .map(|t| TextOverlay {
                x: (t.x as f64 * scale).round() as u32,
                y: (t.y as f64 * scale).round() as u32,
                png_base64: t.png_base64.clone(),
            })
            .collect();
    }
    scaled
}

/// 生成编辑预览图：等比缩放至最长边 600px 内，经完整编辑管线后返回 PNG base64 data URL
pub async fn edit_image_preview(
    input_path: String,
    params: EditParams,
) -> Result<String, String> {
    spawn_blocking(move || {
        let img = image::open(&input_path)
            .map_err(|e| format!("无法打开图片: {}", e))?;

        let (width, height) = img.dimensions();
        let scale = (600.0 / width.max(height) as f64).min(1.0);
        let base = if scale < 1.0 { img.thumbnail(600, 600) } else { img };

        let processed = edit::apply_edits(base, &scale_crop(&params, scale), scale);

        let mut buffer = std::io::Cursor::new(Vec::new());
        processed
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

/// 导出编辑结果：原图经完整管线（scale=1）后按指定格式写入输出路径，返回实际输出路径
pub async fn edit_image_export(
    input_path: String,
    params: EditParams,
    output_path: String,
    format: String,
    quality: u8,
) -> Result<String, String> {
    spawn_blocking(move || {
        let img = image::open(&input_path)
            .map_err(|e| format!("无法打开图片: {}", e))?;

        let mut processed = edit::apply_edits(img, &params, 1.0);

        match format.to_lowercase().as_str() {
            "jpg" | "jpeg" => {
                // JPEG 不支持透明通道，拍平到 RGB；
                // to_rgb8 直接丢弃 alpha 会把透明区域落黑，需先合成到白底
                let has_alpha = matches!(
                    processed.color(),
                    image::ColorType::Rgba8
                        | image::ColorType::Rgba16
                        | image::ColorType::La8
                        | image::ColorType::La16
                );
                if has_alpha {
                    let rgba = processed.to_rgba8();
                    let mut white = RgbaImage::from_pixel(
                        rgba.width(),
                        rgba.height(),
                        Rgba([255, 255, 255, 255]),
                    );
                    imageops::overlay(&mut white, &rgba, 0, 0);
                    processed = DynamicImage::ImageRgb8(DynamicImage::ImageRgba8(white).to_rgb8());
                }
                let mut output_file = std::fs::File::create(&output_path)
                    .map_err(|e| format!("创建输出文件失败: {}", e))?;
                let encoder = JpegEncoder::new_with_quality(&mut output_file, quality);
                processed
                    .write_with_encoder(encoder)
                    .map_err(|e| format!("保存JPEG失败: {}", e))?;
            }
            "webp" => {
                // 有损 WebP 才有质量参数（libwebp，quality 0-100 越大质量越高）；
                // lossy 路径仅支持 Rgb8/Rgba8，先拍平（无损 save_with_format 无质量可言）
                let mut output_file = std::fs::File::create(&output_path)
                    .map_err(|e| format!("创建输出文件失败: {}", e))?;
                #[allow(deprecated)] // 0.24 将 lossy 构造标记 deprecated，质量参数仅此路径可用
                let encoder =
                    WebPEncoder::new_with_quality(&mut output_file, WebPQuality::lossy(quality));
                processed
                    .to_rgba8()
                    .write_with_encoder(encoder)
                    .map_err(|e| format!("保存WebP失败: {}", e))?;
            }
            _ => {
                processed
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

    fn params_with_text() -> EditParams {
        EditParams {
            crop: Some(CropRect { x: 100, y: 50, width: 400, height: 300 }),
            annotations: vec![Annotation {
                kind: "rect".to_string(),
                x: 10,
                y: 20,
                width: 30,
                height: 40,
                color: "#FF0000".to_string(),
                stroke: 4,
                flip: false,
            }],
            text_overlays: vec![TextOverlay {
                x: 200,
                y: 100,
                png_base64: "png-bytes".to_string(),
            }],
            rotation: 0,
            flip_h: false,
            flip_v: false,
            brightness: None,
            contrast: None,
            hue: None,
            grayscale: false,
            invert: false,
            blur: None,
            sharpen: None,
            saturation: None,
        }
    }

    /// H1 回归：预览换算不得清空 text_overlays，坐标与 stroke 一样按 scale 缩放，PNG 原样保留
    #[test]
    fn test_scale_crop_scales_text_overlays() {
        let scaled = scale_crop(&params_with_text(), 0.5);
        assert_eq!(scaled.text_overlays.len(), 1);
        assert_eq!(scaled.text_overlays[0].x, 100);
        assert_eq!(scaled.text_overlays[0].y, 50);
        assert_eq!(scaled.text_overlays[0].png_base64, "png-bytes");
        // crop 与标注同样换算
        let crop = scaled.crop.unwrap();
        assert_eq!((crop.x, crop.y, crop.width, crop.height), (50, 25, 200, 150));
        assert_eq!(scaled.annotations[0].stroke, 2);
    }

    /// scale=1（导出路径）时完全不变
    #[test]
    fn test_scale_crop_identity_at_one() {
        let p = params_with_text();
        let scaled = scale_crop(&p, 1.0);
        assert_eq!(scaled.text_overlays[0].x, 200);
        assert_eq!(scaled.text_overlays[0].y, 100);
    }
}
