use image::{ImageFormat, DynamicImage, imageops::FilterType};
use std::path::{Path, PathBuf};
use super::types::{ConvertParams, ConvertResult};

/// 确定输出格式
fn get_output_format(format_str: &str) -> Result<ImageFormat, String> {
    match format_str.to_lowercase().as_str() {
        "png" => Ok(ImageFormat::Png),
        "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
        "webp" => Ok(ImageFormat::WebP),
        "gif" => Ok(ImageFormat::Gif),
        "bmp" => Ok(ImageFormat::Bmp),
        "tiff" | "tif" => Ok(ImageFormat::Tiff),
        "ico" => Ok(ImageFormat::Ico),
        _ => Err(format!("不支持的格式: {}", format_str)),
    }
}

/// 图片缩放处理
fn resize_image(img: DynamicImage, params: &ConvertParams) -> DynamicImage {
    if let Some(resize) = &params.resize {
        match (resize.width, resize.height, resize.maintain_aspect_ratio) {
            (Some(w), Some(h), false) => {
                // 精确尺寸，不保持比例
                img.resize_exact(w, h, FilterType::Lanczos3)
            }
            (Some(w), Some(h), true) => {
                // 保持比例，适应指定尺寸
                img.resize(w, h, FilterType::Lanczos3)
            }
            (Some(w), None, _) => {
                // 仅指定宽度，自动计算高度
                let ratio = img.height() as f32 / img.width() as f32;
                let new_height = (w as f32 * ratio) as u32;
                img.resize_exact(w, new_height, FilterType::Lanczos3)
            }
            (None, Some(h), _) => {
                // 仅指定高度，自动计算宽度
                let ratio = img.width() as f32 / img.height() as f32;
                let new_width = (h as f32 * ratio) as u32;
                img.resize_exact(new_width, h, FilterType::Lanczos3)
            }
            _ => img,
        }
    } else {
        img
    }
}

/// 生成输出文件路径
fn generate_output_path(input_path: &str, target_format: &str) -> PathBuf {
    let input = Path::new(input_path);
    let parent = input.parent().unwrap_or(Path::new("."));
    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");

    let extension = match target_format.to_lowercase().as_str() {
        "jpg" => "jpg",
        "jpeg" => "jpeg",
        _ => target_format,
    };

    parent.join(format!("{}_converted.{}", stem, extension))
}

/// PNG 优化压缩
/// quality: 1-100，值越高质量越好，体积越大
fn optimize_png(output_path: &Path, quality: u8) -> Result<(), String> {
    // 使用 imagequant 进行有损压缩（如果质量 < 100）
    if quality < 100 {
        // 读取 PNG 文件
        let img = image::open(output_path)
            .map_err(|e| format!("无法读取 PNG 文件用于优化: {}", e))?;

        let rgba = img.to_rgba8();
        let width = rgba.width();
        let height = rgba.height();

        // 使用 imagequant 进行色彩量化
        let mut liq = imagequant::new();
        liq.set_speed(5).map_err(|e| format!("设置 imagequant 速度失败: {}", e))?;

        // 根据 quality 参数计算目标质量范围
        let target_quality = quality;
        let min_quality = if quality > 10 { quality - 10 } else { 0 };
        liq.set_quality(min_quality, target_quality)
            .map_err(|e| format!("设置 imagequant 质量失败: {}", e))?;

        // 转换为 imagequant 需要的格式
        let pixels: Vec<imagequant::RGBA> = rgba.pixels()
            .map(|p| imagequant::RGBA::new(p[0], p[1], p[2], p[3]))
            .collect();

        let mut img_data = liq.new_image(
            pixels,
            width as usize,
            height as usize,
            0.0
        ).map_err(|e| format!("创建 imagequant 图像失败: {}", e))?;

        // 执行量化
        let mut res = match liq.quantize(&mut img_data) {
            Ok(res) => res,
            Err(_) => {
                // 如果量化失败，直接使用 oxipng 无损优化
                optimize_png_lossless(output_path)?;
                return Ok(());
            }
        };

        // 应用抖动
        res.set_dithering_level(1.0)
            .map_err(|e| format!("设置抖动失败: {}", e))?;

        let (palette, pixels) = res.remapped(&mut img_data)
            .map_err(|e| format!("重映射像素失败: {}", e))?;

        // 写入 PNG（使用 png crate）
        let mut output_buffer = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut output_buffer, width, height);
            encoder.set_color(png::ColorType::Indexed);
            encoder.set_depth(png::BitDepth::Eight);

            // 设置调色板
            let palette_bytes: Vec<u8> = palette.iter()
                .flat_map(|c| vec![c.r, c.g, c.b])
                .collect();
            encoder.set_palette(palette_bytes);

            // 设置透明度（如果有）
            let has_alpha = palette.iter().any(|c| c.a < 255);
            if has_alpha {
                let trns: Vec<u8> = palette.iter().map(|c| c.a).collect();
                encoder.set_trns(trns);
            }

            let mut writer = encoder.write_header()
                .map_err(|e| format!("写入 PNG 头失败: {}", e))?;
            writer.write_image_data(&pixels)
                .map_err(|e| format!("写入 PNG 数据失败: {}", e))?;
        }

        // 使用 oxipng 进一步优化
        let options = oxipng::Options::from_preset(4); // 压缩级别 4（平衡速度和效果）
        let optimized = oxipng::optimize_from_memory(&output_buffer, &options)
            .map_err(|e| format!("oxipng 优化失败: {}", e))?;

        // 写入最终文件
        std::fs::write(output_path, optimized)
            .map_err(|e| format!("写入优化后的 PNG 失败: {}", e))?;
    } else {
        // quality = 100，仅使用 oxipng 无损优化
        optimize_png_lossless(output_path)?;
    }

    Ok(())
}

/// PNG 无损优化（使用 oxipng）
fn optimize_png_lossless(output_path: &Path) -> Result<(), String> {
    let options = oxipng::Options {
        strip: oxipng::StripChunks::Safe, // 移除安全的元数据块
        ..oxipng::Options::from_preset(4)
    };

    oxipng::optimize(
        &oxipng::InFile::Path(output_path.to_path_buf()),
        &oxipng::OutFile::Path {
            path: Some(output_path.to_path_buf()),
            preserve_attrs: true,
        },
        &options,
    )
    .map_err(|e| format!("PNG 优化失败: {}", e))?;

    Ok(())
}

/// 转换单个图片
pub async fn convert_image(
    input_path: String,
    params: ConvertParams,
) -> Result<ConvertResult, String> {
    let input_path_clone = input_path.clone();
    let params_clone = params.clone();

    // 使用 spawn_blocking 避免阻塞异步运行时
    tokio::task::spawn_blocking(move || {
        // 读取原始文件大小
        let original_size = std::fs::metadata(&input_path_clone)
            .map(|m| m.len())
            .unwrap_or(0);

        // 打开图片
        let img = image::open(&input_path_clone)
            .map_err(|e| format!("无法打开图片: {}", e))?;

        // 缩放处理
        let processed_img = resize_image(img, &params_clone);

        // 确定输出格式
        let output_format = get_output_format(&params_clone.target_format)?;

        // 生成输出路径
        let output_path = generate_output_path(&input_path_clone, &params_clone.target_format);

        // 保存图片
        match output_format {
            ImageFormat::Jpeg => {
                let quality = params_clone.quality.unwrap_or(85);
                let mut output_file = std::fs::File::create(&output_path)
                    .map_err(|e| format!("创建输出文件失败: {}", e))?;

                let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                    &mut output_file,
                    quality
                );
                processed_img.write_with_encoder(encoder)
                    .map_err(|e| format!("保存JPEG失败: {}", e))?;
            }
            ImageFormat::Png => {
                // 先保存为标准 PNG
                processed_img.save_with_format(&output_path, output_format)
                    .map_err(|e| format!("保存PNG失败: {}", e))?;

                // 使用 PNG 优化
                let quality = params_clone.quality.unwrap_or(85);
                optimize_png(&output_path, quality)?;
            }
            _ => {
                // 其他格式直接保存
                processed_img.save_with_format(&output_path, output_format)
                    .map_err(|e| format!("保存图片失败: {}", e))?;
            }
        }

        // 获取转换后文件大小
        let converted_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        let compression_ratio = if original_size > 0 {
            ((original_size as i64 - converted_size as i64) as f32 / original_size as f32) * 100.0
        } else {
            0.0
        };

        Ok(ConvertResult {
            output_path: output_path.to_str().unwrap_or("").to_string(),
            original_size,
            converted_size,
            compression_ratio,
        })
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}

/// 批量转换图片
pub async fn batch_convert_images(
    input_paths: Vec<String>,
    params: ConvertParams,
    progress_callback: impl Fn(usize, usize) + Send + 'static,
) -> Result<Vec<Result<ConvertResult, String>>, String> {
    let total = input_paths.len();
    let mut results = Vec::new();

    for (index, path) in input_paths.into_iter().enumerate() {
        let result = convert_image(path, params.clone()).await;
        results.push(result);
        progress_callback(index + 1, total);
    }

    Ok(results)
}
