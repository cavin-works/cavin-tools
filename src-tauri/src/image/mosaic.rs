/**
 * 图片马赛克功能
 */

use image::{GenericImage, GenericImageView, Rgba, RgbaImage};
use serde::{Deserialize, Serialize};
use std::path::Path;

use super::ImageError;

/**
 * 马赛克区域类型
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "regionType")]
pub enum MosaicRegion {
    #[serde(rename = "rect")]
    Rect {
        x: u32,
        y: u32,
        width: u32,
        height: u32,
    },
    #[serde(rename = "ellipse")]
    Ellipse {
        x: u32,
        y: u32,
        width: u32,
        height: u32,
    },
    #[serde(rename = "brush")]
    Brush {
        points: Vec<MosaicPoint>,
    },
}

/**
 * 马赛克画笔点
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MosaicPoint {
    pub x: u32,
    pub y: u32,
}

/**
 * 马赛克参数
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MosaicParams {
    pub regions: Vec<MosaicRegion>,
    #[serde(rename = "blockSize")]
    pub block_size: u32,
}

/**
 * 应用马赛克效果到图片
 *
 * # 参数
 * - input_path: 输入图片路径
 * - output_path: 输出图片路径
 * - params: 马赛克参数
 *
 * # 返回
 * 成功时返回 Ok(())，失败时返回错误信息
 */
pub fn apply_mosaic(
    input_path: String,
    output_path: String,
    params: MosaicParams,
) -> Result<(), ImageError> {
    // 打开图片
    let mut img = image::open(&input_path)?.to_rgba8();
    let (_img_width, _img_height) = img.dimensions();

    // 验证块大小
    if params.block_size < 1 || params.block_size > 100 {
        return Err(ImageError {
            message: format!("无效的马赛克块大小: {}", params.block_size),
            error_type: "InvalidBlockSize".to_string(),
        });
    }

    // 处理每个区域
    for region in &params.regions {
        match region {
            MosaicRegion::Rect { x, y, width, height } => {
                apply_mosaic_to_rect(&mut img, *x, *y, *width, *height, params.block_size)?;
            }
            MosaicRegion::Ellipse { x, y, width, height } => {
                apply_mosaic_to_ellipse(&mut img, *x, *y, *width, *height, params.block_size)?;
            }
            MosaicRegion::Brush { points } => {
                apply_mosaic_to_brush(&mut img, points, params.block_size)?;
            }
        }
    }

    // 保存处理后的图片
    img.save(&output_path)?;

    Ok(())
}

/**
 * 对矩形区域应用马赛克
 */
fn apply_mosaic_to_rect(
    img: &mut RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    block_size: u32,
) -> Result<(), ImageError> {
    let (img_width, img_height) = img.dimensions();

    // 验证区域
    if x + width > img_width || y + height > img_height {
        return Err(ImageError {
            message: format!(
                "马赛克区域超出图片范围: ({}, {}, {}, {})",
                x, y, width, height
            ),
            error_type: "InvalidMosaicRegion".to_string(),
        });
    }

    // 处理每个块
    for block_y in (y..(y + height)).step_by(block_size as usize) {
        for block_x in (x..(x + width)).step_by(block_size as usize) {
            // 计算实际块大小（处理边界）
            let actual_width = block_size.min(x + width - block_x);
            let actual_height = block_size.min(y + height - block_y);

            // 计算块的平均颜色
            let (avg_r, avg_g, avg_b, avg_a) = calculate_average_color(
                img,
                block_x,
                block_y,
                actual_width,
                actual_height,
            );

            // 用平均颜色填充整个块
            for py in block_y..(block_y + actual_height) {
                for px in block_x..(block_x + actual_width) {
                    img.put_pixel(px, py, Rgba([avg_r, avg_g, avg_b, avg_a]));
                }
            }
        }
    }

    Ok(())
}

/**
 * 对椭圆区域应用马赛克
 */
fn apply_mosaic_to_ellipse(
    img: &mut RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    block_size: u32,
) -> Result<(), ImageError> {
    let (img_width, img_height) = img.dimensions();
    let center_x = x + width / 2;
    let center_y = y + height / 2;
    let radius_x = width as f64 / 2.0;
    let radius_y = height as f64 / 2.0;

    // 验证区域
    if x + width > img_width || y + height > img_height {
        return Err(ImageError {
            message: format!(
                "椭圆区域超出图片范围: ({}, {}, {}, {})",
                x, y, width, height
            ),
            error_type: "InvalidMosaicRegion".to_string(),
        });
    }

    // 处理边界框内的每个块
    for block_y in (y..(y + height)).step_by(block_size as usize) {
        for block_x in (x..(x + width)).step_by(block_size as usize) {
            let actual_width = block_size.min(x + width - block_x);
            let actual_height = block_size.min(y + height - block_y);

            // 检查块中心是否在椭圆内
            let block_center_x = block_x + actual_width / 2;
            let block_center_y = block_y + actual_height / 2;

            let dx = (block_center_x as f64 - center_x as f64) / radius_x;
            let dy = (block_center_y as f64 - center_y as f64) / radius_y;

            if dx * dx + dy * dy <= 1.0 {
                // 在椭圆内，应用马赛克
                let (avg_r, avg_g, avg_b, avg_a) = calculate_average_color(
                    img,
                    block_x,
                    block_y,
                    actual_width,
                    actual_height,
                );

                for py in block_y..(block_y + actual_height) {
                    for px in block_x..(block_x + actual_width) {
                        // 再次检查像素是否在椭圆内
                        let px_dx = (px as f64 - center_x as f64) / radius_x;
                        let px_dy = (py as f64 - center_y as f64) / radius_y;

                        if px_dx * px_dx + px_dy * px_dy <= 1.0 {
                            img.put_pixel(px, py, Rgba([avg_r, avg_g, avg_b, avg_a]));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

/**
 * 对画笔路径应用马赛克
 */
fn apply_mosaic_to_brush(
    img: &mut RgbaImage,
    points: &[MosaicPoint],
    block_size: u32,
) -> Result<(), ImageError> {
    let brush_radius = block_size;

    for point in points {
        let x = point.x.saturating_sub(brush_radius);
        let y = point.y.saturating_sub(brush_radius);
        let width = (brush_radius * 2).min(img.width() - x);
        let height = (brush_radius * 2).min(img.height() - y);

        apply_mosaic_to_rect(img, x, y, width, height, block_size)?;
    }

    Ok(())
}

/**
 * 计算区域平均颜色
 */
fn calculate_average_color(
    img: &RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> (u8, u8, u8, u8) {
    let mut sum_r: u64 = 0;
    let mut sum_g: u64 = 0;
    let mut sum_b: u64 = 0;
    let mut sum_a: u64 = 0;
    let mut count: u64 = 0;

    for py in y..(y + height) {
        for px in x..(x + width) {
            let pixel = img.get_pixel(px, py);
            sum_r += pixel[0] as u64;
            sum_g += pixel[1] as u64;
            sum_b += pixel[2] as u64;
            sum_a += pixel[3] as u64;
            count += 1;
        }
    }

    if count == 0 {
        return (0, 0, 0, 255);
    }

    (
        (sum_r / count) as u8,
        (sum_g / count) as u8,
        (sum_b / count) as u8,
        (sum_a / count) as u8,
    )
}
