use super::ImageError;
use image::{DynamicImage, ImageBuffer, Rgb};
use image::imageops::{self, resize, FilterType};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 拼图参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollageParams {
    /// 图片路径列表
    pub image_paths: Vec<String>,
    /// 网格行数
    pub rows: u32,
    /// 网格列数
    pub columns: u32,
    /// 图片间距（像素）
    pub gap: u32,
    /// 背景颜色（RGB）
    pub background_color: (u8, u8, u8),
    /// 输出宽度（可选，用于自动计算高度）
    pub output_width: Option<u32>,
}

/// 创建网格拼图
pub fn create_grid_collage(
    params: CollageParams,
    output_path: String,
) -> Result<(), ImageError> {
    // 验证参数
    if params.image_paths.is_empty() {
        return Err(ImageError {
            message: "图片路径列表不能为空".to_string(),
            error_type: "ValidationError".to_string(),
        });
    }

    if params.rows == 0 || params.columns == 0 {
        return Err(ImageError {
            message: "行数和列数必须大于0".to_string(),
            error_type: "ValidationError".to_string(),
        });
    }

    let expected_count = (params.rows * params.columns) as usize;
    if params.image_paths.len() != expected_count {
        return Err(ImageError {
            message: format!(
                "图片数量不匹配: 期望 {} 张，实际 {} 张",
                expected_count,
                params.image_paths.len()
            ),
            error_type: "ValidationError".to_string(),
        });
    }

    // 加载所有图片
    let mut images: Vec<DynamicImage> = Vec::new();
    for path in &params.image_paths {
        let img = image::open(path).map_err(|e| ImageError {
            message: format!("无法加载图片 {}: {}", path, e),
            error_type: "ImageError".to_string(),
        })?;
        images.push(img);
    }

    // 计算单个图片的尺寸
    // 总宽度 = (列数 * 图片宽度) + ((列数 - 1) * 间距)
    // 如果指定了输出宽度，则计算单张图片宽度
    let cell_width = if let Some(output_w) = params.output_width {
        let total_gap = (params.columns - 1) * params.gap;
        (output_w - total_gap) / params.columns
    } else {
        // 使用第一张图片的宽度
        images[0].width()
    };

    // 计算单元格高度（保持第一张图片的宽高比）
    let first_aspect = images[0].height() as f32 / images[0].width() as f32;
    let cell_height = (cell_width as f32 * first_aspect).round() as u32;

    // 计算最终输出尺寸
    let total_width = params.columns * cell_width + (params.columns - 1) * params.gap;
    let total_height = params.rows * cell_height + (params.rows - 1) * params.gap;

    // 创建空白画布
    let mut collage: ImageBuffer<Rgb<u8>, Vec<u8>> =
        ImageBuffer::new(total_width, total_height);

    // 填充背景色
    for pixel in collage.pixels_mut() {
        *pixel = Rgb([params.background_color.0, params.background_color.1, params.background_color.2]);
    }

    // 将图片放置到网格中
    for (index, img) in images.iter().enumerate() {
        let row = (index as u32) / params.columns;
        let col = (index as u32) % params.columns;

        // 计算该单元格的位置
        let x = col * (cell_width + params.gap);
        let y = row * (cell_height + params.gap);

        // 调整图片大小以适应单元格
        let resized = resize(
            img,
            cell_width,
            cell_height,
            FilterType::Lanczos3,
        );

        // 将图片复制到画布上
        for dy in 0..cell_height {
            for dx in 0..cell_width {
                if let Some(pixel) = resized.get_pixel_checked(dx, dy) {
                    let canvas_x = x + dx;
                    let canvas_y = y + dy;
                    if canvas_x < total_width && canvas_y < total_height {
                        // 转换为 RGB（忽略 Alpha）
                        let rgb = Rgb([pixel[0], pixel[1], pixel[2]]);
                        collage.put_pixel(canvas_x, canvas_y, rgb);
                    }
                }
            }
        }
    }

    // 保存结果
    let output_extension = Path::new(&output_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("jpg");

    DynamicImage::ImageRgb8(collage)
        .save(&output_path)
        .map_err(|e| ImageError {
            message: format!("保存拼图失败: {}", e),
            error_type: "IoError".to_string(),
        })?;

    Ok(())
}

/// 获取预设拼图配置
pub fn get_preset_collages() -> Vec<PresetCollage> {
    vec![
        PresetCollage {
            name: "2x2 拼图".to_string(),
            rows: 2,
            columns: 2,
            description: "4张图片，2行2列".to_string(),
        },
        PresetCollage {
            name: "3x3 拼图".to_string(),
            rows: 3,
            columns: 3,
            description: "9张图片，3行3列".to_string(),
        },
        PresetCollage {
            name: "4x4 拼图".to_string(),
            rows: 4,
            columns: 4,
            description: "16张图片，4行4列".to_string(),
        },
        PresetCollage {
            name: "1x3 横条".to_string(),
            rows: 1,
            columns: 3,
            description: "3张图片，1行3列".to_string(),
        },
        PresetCollage {
            name: "3x1 竖条".to_string(),
            rows: 3,
            columns: 1,
            description: "3张图片，3行1列".to_string(),
        },
    ]
}

/// 预设拼图配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetCollage {
    pub name: String,
    pub rows: u32,
    pub columns: u32,
    pub description: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_collage_params() {
        let params = CollageParams {
            image_paths: vec!["test1.jpg".to_string(), "test2.jpg".to_string()],
            rows: 1,
            columns: 2,
            gap: 10,
            background_color: (255, 255, 255),
            output_width: None,
        };

        assert_eq!(params.rows * params.columns, 2);
        assert_eq!(params.image_paths.len(), 2);
    }
}
