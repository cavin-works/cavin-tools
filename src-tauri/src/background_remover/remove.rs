use image::{DynamicImage, RgbaImage, Rgba, ImageFormat, GenericImageView};
use std::path::{Path, PathBuf};
use std::time::Instant;
use std::io::Cursor;
use ort::session::Session;
use super::types::{RemoveBackgroundParams, RemoveBackgroundResult, Dimensions};
use super::model::get_model_path;

// 模型输入尺寸
const MODEL_INPUT_SIZE: u32 = 1024;

/// 生成输出文件路径
fn generate_output_path(input_path: &str, format: &str) -> PathBuf {
    let input = Path::new(input_path);
    let parent = input.parent().unwrap_or(Path::new("."));
    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");

    parent.join(format!("{}_no_bg.{}", stem, format))
}

/// 预处理图像为模型输入
fn preprocess_image(img: &DynamicImage) -> (Vec<f32>, u32, u32) {
    let (orig_width, orig_height) = img.dimensions();

    // 缩放到模型输入尺寸
    let resized = img.resize_exact(
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
        image::imageops::FilterType::Lanczos3,
    );

    let rgb = resized.to_rgb8();

    // 转换为 NCHW 格式并归一化到 [0, 1]
    let mut data = vec![0.0f32; (3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE) as usize];
    let hw = (MODEL_INPUT_SIZE * MODEL_INPUT_SIZE) as usize;

    for y in 0..MODEL_INPUT_SIZE {
        for x in 0..MODEL_INPUT_SIZE {
            let pixel = rgb.get_pixel(x, y);
            let idx = (y * MODEL_INPUT_SIZE + x) as usize;
            data[idx] = pixel[0] as f32 / 255.0;           // R channel
            data[hw + idx] = pixel[1] as f32 / 255.0;      // G channel
            data[2 * hw + idx] = pixel[2] as f32 / 255.0;  // B channel
        }
    }

    (data, orig_width, orig_height)
}

/// 后处理模型输出为 alpha mask (灰度图)
fn postprocess_mask(output_shape: &[i64], output_data: &[f32], orig_width: u32, orig_height: u32) -> image::GrayImage {
    // 输出形状通常是 [1, 1, H, W] 或 [1, H, W]
    let (mask_height, mask_width) = if output_shape.len() == 4 {
        (output_shape[2] as usize, output_shape[3] as usize)
    } else if output_shape.len() == 3 {
        (output_shape[1] as usize, output_shape[2] as usize)
    } else {
        (MODEL_INPUT_SIZE as usize, MODEL_INPUT_SIZE as usize)
    };

    // 创建 mask 图像
    let mut mask = image::GrayImage::new(mask_width as u32, mask_height as u32);

    for y in 0..mask_height {
        for x in 0..mask_width {
            let idx = y * mask_width + x;
            let value = if idx < output_data.len() {
                output_data[idx]
            } else {
                0.0
            };

            // 将值限制在 [0, 1] 并转换为 u8
            let alpha = (value.clamp(0.0, 1.0) * 255.0) as u8;
            mask.put_pixel(x as u32, y as u32, image::Luma([alpha]));
        }
    }

    // 缩放回原始尺寸
    let resized_mask = image::imageops::resize(
        &mask,
        orig_width,
        orig_height,
        image::imageops::FilterType::Lanczos3,
    );

    resized_mask
}

/// 应用 mask 到原始图像
fn apply_mask(img: &DynamicImage, mask: &image::GrayImage) -> RgbaImage {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let mut result = RgbaImage::new(width, height);

    for y in 0..height {
        for x in 0..width {
            let pixel = rgba.get_pixel(x, y);
            let alpha = mask.get_pixel(x, y)[0];

            result.put_pixel(x, y, Rgba([pixel[0], pixel[1], pixel[2], alpha]));
        }
    }

    result
}

/// 应用边缘羽化（简单的均值模糊）
fn apply_feather(img: &mut RgbaImage, feather: u8) {
    if feather == 0 {
        return;
    }

    let radius = feather as i32;
    let (width, height) = img.dimensions();
    let original = img.clone();

    for y in 0..height {
        for x in 0..width {
            let mut sum_alpha = 0.0f32;
            let mut count = 0.0f32;

            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let nx = x as i32 + dx;
                    let ny = y as i32 + dy;

                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let pixel = original.get_pixel(nx as u32, ny as u32);
                        sum_alpha += pixel[3] as f32;
                        count += 1.0;
                    }
                }
            }

            let avg_alpha = (sum_alpha / count) as u8;
            let pixel = img.get_pixel_mut(x, y);
            pixel[3] = avg_alpha;
        }
    }
}

/// 应用背景颜色
fn apply_background_color(img: &mut RgbaImage, color: &str) {
    if color == "transparent" {
        return;
    }

    // 解析 #RRGGBB 颜色
    let color = color.trim_start_matches('#');
    if color.len() != 6 {
        return;
    }

    let r = u8::from_str_radix(&color[0..2], 16).unwrap_or(255);
    let g = u8::from_str_radix(&color[2..4], 16).unwrap_or(255);
    let b = u8::from_str_radix(&color[4..6], 16).unwrap_or(255);

    let (width, height) = img.dimensions();

    for y in 0..height {
        for x in 0..width {
            let pixel = img.get_pixel(x, y);
            let alpha = pixel[3] as f32 / 255.0;

            if alpha < 1.0 {
                // Alpha 混合
                let new_r = (pixel[0] as f32 * alpha + r as f32 * (1.0 - alpha)) as u8;
                let new_g = (pixel[1] as f32 * alpha + g as f32 * (1.0 - alpha)) as u8;
                let new_b = (pixel[2] as f32 * alpha + b as f32 * (1.0 - alpha)) as u8;

                img.put_pixel(x, y, Rgba([new_r, new_g, new_b, 255]));
            }
        }
    }
}

/// 去除单张图片背景
pub async fn remove_background(
    input_path: String,
    params: RemoveBackgroundParams,
) -> Result<RemoveBackgroundResult, String> {
    let start_time = Instant::now();

    let input_path_clone = input_path.clone();
    let params_clone = params.clone();

    tokio::task::spawn_blocking(move || {
        // 读取原始文件大小
        let original_size = std::fs::metadata(&input_path_clone)
            .map(|m| m.len())
            .unwrap_or(0);

        // 打开图片
        let img = image::open(&input_path_clone)
            .map_err(|e| format!("无法打开图片: {}", e))?;

        let original_dimensions = Dimensions {
            width: img.width(),
            height: img.height(),
        };

        // 获取模型路径
        let model_path = get_model_path()?;
        if !model_path.exists() {
            return Err("模型未下载，请先下载模型".to_string());
        }

        // 加载模型
        let mut session = Session::builder()
            .map_err(|e| format!("创建会话构建器失败: {}", e))?
            .commit_from_file(&model_path)
            .map_err(|e| format!("加载模型失败: {}", e))?;

        // 预处理图像
        let (input_data, orig_width, orig_height) = preprocess_image(&img);

        // 创建输入张量
        let shape = vec![1i64, 3, MODEL_INPUT_SIZE as i64, MODEL_INPUT_SIZE as i64];
        let input_value = ort::value::Value::from_array((shape.as_slice(), input_data.into_boxed_slice()))
            .map_err(|e| format!("创建输入张量失败: {}", e))?;

        // 获取输入名称
        let input_name = session.inputs().first()
            .map(|i| i.name().to_string())
            .unwrap_or_else(|| "input".to_string());

        // 运行推理
        let outputs = session.run(ort::inputs![input_name.as_str() => input_value])
            .map_err(|e| format!("推理失败: {}", e))?;

        // 获取输出
        let (_, output_value) = outputs.iter().next()
            .ok_or("无法获取模型输出")?;

        let (output_shape, output_data) = output_value
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("提取输出张量失败: {}", e))?;

        // 后处理得到 mask
        let shape_dims: Vec<i64> = output_shape.iter().map(|&d| d as i64).collect();
        let mask = postprocess_mask(&shape_dims, output_data, orig_width, orig_height);

        // 应用 mask 到原图
        let mut rgba_img = apply_mask(&img, &mask);

        // 应用边缘羽化
        if params_clone.feather > 0 {
            apply_feather(&mut rgba_img, params_clone.feather);
        }

        // 应用背景颜色
        if let Some(ref color) = params_clone.background_color {
            apply_background_color(&mut rgba_img, color);
        }

        // 生成输出路径
        let output_path = generate_output_path(&input_path_clone, &params_clone.output_format);

        // 保存结果
        match params_clone.output_format.as_str() {
            "webp" => {
                DynamicImage::ImageRgba8(rgba_img.clone()).save(&output_path)
                    .map_err(|e| format!("保存 WebP 失败: {}", e))?;
            }
            _ => {
                rgba_img.save(&output_path)
                    .map_err(|e| format!("保存 PNG 失败: {}", e))?;
            }
        }

        // 获取处理后文件大小
        let processed_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        // 生成 Base64（如果需要）
        let base64_data = if params_clone.return_base64 {
            use base64::Engine;
            let mut buffer = Vec::new();
            let mut cursor = Cursor::new(&mut buffer);
            rgba_img.write_to(&mut cursor, ImageFormat::Png)
                .map_err(|e| format!("编码图片失败: {}", e))?;
            Some(format!("data:image/png;base64,{}",
                base64::engine::general_purpose::STANDARD.encode(&buffer)))
        } else {
            None
        };

        let processing_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(RemoveBackgroundResult {
            output_path: output_path.to_string_lossy().to_string(),
            original_size,
            processed_size,
            processing_time_ms,
            base64_data,
            original_dimensions,
        })
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}

/// 批量去除背景
pub async fn batch_remove_backgrounds<F>(
    input_paths: Vec<String>,
    params: RemoveBackgroundParams,
    progress_callback: F,
) -> Result<Vec<Result<RemoveBackgroundResult, String>>, String>
where
    F: Fn(usize, usize) + Send + 'static,
{
    let total = input_paths.len();
    let mut results = Vec::new();

    for (index, path) in input_paths.into_iter().enumerate() {
        let result = remove_background(path, params.clone()).await;
        results.push(result);
        progress_callback(index + 1, total);
    }

    Ok(results)
}
