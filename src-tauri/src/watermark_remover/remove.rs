use image::{DynamicImage, RgbaImage, Rgba};
use std::path::{Path, PathBuf};
use super::types::{RemoveParams, RemoveResult, WatermarkInfo};
use super::detect::{detect_watermark_params, calculate_watermark_params};

// 嵌入 Alpha Map 资源（编译时）
const ALPHA_MAP_48: &[u8] = include_bytes!("assets/watermark_48x48.png");
const ALPHA_MAP_96: &[u8] = include_bytes!("assets/watermark_96x96.png");

// 算法常量
const ALPHA_THRESHOLD: f32 = 0.002;  // 忽略非常小的 alpha 值（噪声）
const MAX_ALPHA: f32 = 0.99;          // 避免除以接近零的值
const LOGO_VALUE: f32 = 255.0;        // 白色水印的颜色值

/// 加载 Alpha Map
fn load_alpha_map(size: u32) -> Result<RgbaImage, String> {
    let bytes = match size {
        48 => ALPHA_MAP_48,
        96 => ALPHA_MAP_96,
        _ => return Err(format!("不支持的水印尺寸: {}", size)),
    };

    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("加载 Alpha Map 失败: {}", e))?;

    Ok(img.to_rgba8())
}

/// 从 Alpha Map 图像计算 Alpha 值数组
///
/// 算法：取 RGB 三通道最大值并归一化到 [0, 1]
fn calculate_alpha_values(alpha_map: &RgbaImage) -> Vec<f32> {
    let (width, height) = alpha_map.dimensions();
    let mut alpha_values = Vec::with_capacity((width * height) as usize);

    for y in 0..height {
        for x in 0..width {
            let pixel = alpha_map.get_pixel(x, y);
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;

            // 取 RGB 三通道最大值作为亮度值
            let max_channel = r.max(g).max(b);

            // 归一化到 [0, 1] 范围
            alpha_values.push(max_channel / 255.0);
        }
    }

    alpha_values
}

/// 反向 Alpha 混合算法
///
/// 原理：
/// Gemini 添加水印：watermarked = α × logo + (1 - α) × original
/// 反向求解：original = (watermarked - α × logo) / (1 - α)
fn reverse_alpha_blend(
    img: &mut RgbaImage,
    alpha_values: &[f32],
    watermark_info: &WatermarkInfo,
) {
    let watermark_size = watermark_info.watermark_size;
    let region_x = watermark_info.region_x;
    let region_y = watermark_info.region_y;

    // 处理水印区域的每个像素
    for row in 0..watermark_size {
        for col in 0..watermark_size {
            let x = region_x + col;
            let y = region_y + row;

            // 边界检查
            if x >= img.width() || y >= img.height() {
                continue;
            }

            // 获取 alpha 值
            let alpha_idx = (row * watermark_size + col) as usize;
            let mut alpha = alpha_values[alpha_idx];

            // 跳过非常小的 alpha 值（噪声）
            if alpha < ALPHA_THRESHOLD {
                continue;
            }

            // 限制 alpha 值以避免除以接近零的值
            alpha = alpha.min(MAX_ALPHA);
            let one_minus_alpha = 1.0 - alpha;

            // 获取当前像素
            let pixel = img.get_pixel(x, y);
            let mut new_pixel = [0u8; 4];

            // 对 RGB 三个通道应用反向混合
            for c in 0..3 {
                let watermarked = pixel[c] as f32;

                // 反向 alpha 混合公式
                let original = (watermarked - alpha * LOGO_VALUE) / one_minus_alpha;

                // 限制在 [0, 255] 范围内
                new_pixel[c] = original.clamp(0.0, 255.0).round() as u8;
            }

            // Alpha 通道保持不变
            new_pixel[3] = pixel[3];

            img.put_pixel(x, y, Rgba(new_pixel));
        }
    }
}

/// 生成输出文件路径
fn generate_output_path(input_path: &str) -> PathBuf {
    let input = Path::new(input_path);
    let parent = input.parent().unwrap_or(Path::new("."));
    let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
    let ext = input.extension().and_then(|s| s.to_str()).unwrap_or("png");

    parent.join(format!("{}_no_watermark.{}", stem, ext))
}

/// 去除单张图片的水印
pub async fn remove_watermark(
    input_path: String,
    params: RemoveParams,
) -> Result<RemoveResult, String> {
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

        // 检测水印参数
        let watermark_info = if params_clone.auto_detect {
            detect_watermark_params(&img)
        } else if let Some(size) = params_clone.manual_size {
            calculate_watermark_params(img.width(), img.height(), size)
        } else {
            detect_watermark_params(&img)
        };

        // 加载对应的 Alpha Map
        let alpha_map = load_alpha_map(watermark_info.watermark_size)?;

        // 计算 Alpha 值数组
        let alpha_values = calculate_alpha_values(&alpha_map);

        // 转换为 RGBA
        let mut rgba_img = img.to_rgba8();

        // 应用反向 Alpha 混合
        reverse_alpha_blend(&mut rgba_img, &alpha_values, &watermark_info);

        // 生成输出路径
        let output_path = generate_output_path(&input_path_clone);

        // 保存结果图片
        // 根据输入格式决定输出格式
        let input_ext = Path::new(&input_path_clone)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("png")
            .to_lowercase();

        match input_ext.as_str() {
            "jpg" | "jpeg" => {
                // JPEG 格式：转换为 RGB 后保存
                let rgb_img = DynamicImage::ImageRgba8(rgba_img).to_rgb8();
                rgb_img.save(&output_path)
                    .map_err(|e| format!("保存图片失败: {}", e))?;
            }
            "webp" => {
                // WebP 格式
                DynamicImage::ImageRgba8(rgba_img).save(&output_path)
                    .map_err(|e| format!("保存图片失败: {}", e))?;
            }
            _ => {
                // PNG 等其他格式
                rgba_img.save(&output_path)
                    .map_err(|e| format!("保存图片失败: {}", e))?;
            }
        }

        // 获取处理后文件大小
        let processed_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(RemoveResult {
            output_path: output_path.to_str().unwrap_or("").to_string(),
            original_size,
            processed_size,
            watermark_detected: watermark_info.detected,
            watermark_info: Some(watermark_info),
        })
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}

/// 批量去除水印
pub async fn batch_remove_watermarks(
    input_paths: Vec<String>,
    params: RemoveParams,
    progress_callback: impl Fn(usize, usize) + Send + 'static,
) -> Result<Vec<Result<RemoveResult, String>>, String> {
    let total = input_paths.len();
    let mut results = Vec::new();

    for (index, path) in input_paths.into_iter().enumerate() {
        let result = remove_watermark(path, params.clone()).await;
        results.push(result);
        progress_callback(index + 1, total);
    }

    Ok(results)
}
