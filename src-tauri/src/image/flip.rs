/**
 * 图片翻转功能
 */

use image::DynamicImage;
use serde::{Deserialize, Serialize};

use super::ImageError;

/**
 * 翻转参数
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlipParams {
    /// 水平翻转
    pub horizontal: bool,
    /// 垂直翻转
    pub vertical: bool,
}

/**
 * 翻转图片
 *
 * # 参数
 * - input_path: 输入图片路径
 * - output_path: 输出图片路径
 * - params: 翻转参数
 *
 * # 返回
 * 成功时返回 Ok(())，失败时返回错误信息
 */
pub fn flip_image(
    input_path: String,
    output_path: String,
    params: FlipParams,
) -> Result<(), ImageError> {
    // 打开图片
    let img = image::open(&input_path)?;

    // 执行翻转
    let flipped_img: DynamicImage = if params.horizontal && params.vertical {
        let flipped_h = image::imageops::flip_horizontal(&img);
        DynamicImage::ImageRgba8(image::imageops::flip_vertical(&flipped_h))
    } else if params.horizontal {
        DynamicImage::ImageRgba8(image::imageops::flip_horizontal(&img))
    } else if params.vertical {
        DynamicImage::ImageRgba8(image::imageops::flip_vertical(&img))
    } else {
        img
    };

    // 保存翻转后的图片
    flipped_img.save(&output_path)?;

    Ok(())
}
