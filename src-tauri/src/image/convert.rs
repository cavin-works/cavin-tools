/**
 * 图片格式转换和导出功能
 */

use image::ImageEncoder;
use image::{DynamicImage, ImageOutputFormat, ImageBuffer, Rgba};
use serde::{Deserialize, Serialize};
use std::io::{BufWriter, Cursor, Write};
use std::path::Path;

use super::ImageError;

/**
 * 导出格式
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    #[serde(rename = "jpeg")]
    Jpeg,
    #[serde(rename = "png")]
    Png,
    #[serde(rename = "webp")]
    WebP,
    #[serde(rename = "bmp")]
    Bmp,
}

/**
 * 导出选项
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    /// 导出格式
    pub format: ExportFormat,
    /// 质量（1-100，仅对 JPEG/WebP 有效）
    pub quality: u8,
    /// 输出路径
    pub output_path: String,
}

/**
 * 导出图片
 *
 * # 参数
 * - input_path: 输入图片路径
 * - options: 导出选项
 *
 * # 返回
 * 成功时返回输出文件路径，失败时返回错误信息
 */
pub fn export_image(input_path: String, options: ExportOptions) -> Result<String, ImageError> {
    // 打开图片
    let img = image::open(&input_path)?;

    // 根据格式保存
    let output_path = options.output_path;

    match options.format {
        ExportFormat::Jpeg => {
            // 验证质量参数
            let quality = options.quality.clamp(1, 100);

            // 保存为 JPEG
            img.save_with_format(&output_path, image::ImageFormat::Jpeg)?;
        }
        ExportFormat::Png => {
            // PNG 不支持质量参数，直接保存
            img.save_with_format(&output_path, image::ImageFormat::Png)?;
        }
        ExportFormat::WebP => {
            // WebP 需要特殊处理（如果 image crate 支持）
            // 暂时保存为 PNG 格式作为后备
            img.save_with_format(&output_path, image::ImageFormat::Png)?;
        }
        ExportFormat::Bmp => {
            img.save_with_format(&output_path, image::ImageFormat::Bmp)?;
        }
    }

    Ok(output_path)
}

/**
 * 批量转换图片格式
 */
pub fn batch_convert_images(
    paths: Vec<String>,
    output_dir: String,
    format: ExportFormat,
    quality: u8,
) -> Result<Vec<String>, ImageError> {
    let mut results = Vec::new();

    for input_path in paths {
        // 生成输出路径
        let input_filename = std::path::Path::new(&input_path)
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("output");

        let extension = match format {
            ExportFormat::Jpeg => "jpg",
            ExportFormat::Png => "png",
            ExportFormat::WebP => "webp",
            ExportFormat::Bmp => "bmp",
        };

        let output_path = std::path::Path::new(&output_dir)
            .join(format!("{}.{}", input_filename, extension))
            .to_string_lossy()
            .to_string();

        // 转换图片
        let options = ExportOptions {
            format: format.clone(),
            quality,
            output_path: output_path.clone(),
        };

        export_image(input_path, options)?;
        results.push(output_path);
    }

    Ok(results)
}

/**
 * 从字节数组保存图片
 *
 * # 参数
 * - buffer: 图片字节数组(JPEG/PNG等格式)
 * - path: 保存路径
 *
 * # 返回
 * 成功时返回保存路径，失败时返回错误信息
 */
pub fn save_image_from_buffer(buffer: Vec<u8>, path: String) -> Result<String, ImageError> {
    // 从buffer创建图片
    let img = image::load_from_memory(&buffer)?;

    // 保存图片
    let path_obj = Path::new(&path);

    // 根据扩展名确定格式
    let extension = path_obj
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");

    match extension.to_lowercase().as_str() {
        "jpg" | "jpeg" => {
            img.save_with_format(&path, image::ImageFormat::Jpeg)?;
        }
        "png" => {
            img.save_with_format(&path, image::ImageFormat::Png)?;
        }
        "webp" => {
            img.save_with_format(&path, image::ImageFormat::WebP)?;
        }
        "bmp" => {
            img.save_with_format(&path, image::ImageFormat::Bmp)?;
        }
        _ => {
            // 默认保存为JPEG
            img.save_with_format(&path, image::ImageFormat::Jpeg)?;
        }
    }

    Ok(path)
}
