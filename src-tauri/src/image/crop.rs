/**
 * 图片裁剪功能
 */

use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::path::Path;

use super::ImageError;

/**
 * 裁剪参数
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CropParams {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/**
 * 裁剪图片
 *
 * # 参数
 * - input_path: 输入图片路径
 * - output_path: 输出图片路径
 * - params: 裁剪参数
 *
 * # 返回
 * 成功时返回 Ok(())，失败时返回错误信息
 */
pub fn crop_image(
    input_path: String,
    output_path: String,
    params: CropParams,
) -> Result<(), ImageError> {
    // 打开图片
    let mut img = image::open(&input_path)?;

    // 验证裁剪区域
    let (img_width, img_height) = img.dimensions();

    if params.x + params.width > img_width || params.y + params.height > img_height {
        return Err(ImageError {
            message: format!(
                "裁剪区域超出图片范围: 图片尺寸 {}x{}, 裁剪区域 ({}, {}, {}, {})",
                img_width, img_height, params.x, params.y, params.width, params.height
            ),
            error_type: "InvalidCropArea".to_string(),
        });
    }

    // 执行裁剪
    let cropped_img = img.crop(
        params.x,
        params.y,
        params.width.min(img_width - params.x),
        params.height.min(img_height - params.y),
    );

    // 保存裁剪后的图片
    let output_format = image::ImageFormat::from_path(&output_path)?;
    cropped_img.save(&output_path)?;

    Ok(())
}

/**
 * 批量裁剪图片
 */
pub fn batch_crop_images(
    paths: Vec<String>,
    output_dir: String,
    params: CropParams,
) -> Result<Vec<String>, ImageError> {
    let mut results = Vec::new();

    for input_path in paths {
        // 生成输出路径
        let input_filename = Path::new(&input_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("output.jpg");

        let output_path = Path::new(&output_dir)
            .join(format!("cropped_{}", input_filename))
            .to_string_lossy()
            .to_string();

        // 裁剪图片
        crop_image(input_path.clone(), output_path.clone(), params.clone())?;
        results.push(output_path);
    }

    Ok(results)
}
