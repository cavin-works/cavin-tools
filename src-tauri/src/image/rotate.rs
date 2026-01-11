/**
 * 图片旋转功能
 */

use image::DynamicImage;
use serde::{Deserialize, Serialize};

use super::ImageError;

/**
 * 旋转参数
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RotateParams {
    /// 旋转角度（0, 90, 180, 270）
    pub angle: u32,
}

/**
 * 旋转图片
 *
 * # 参数
 * - input_path: 输入图片路径
 * - output_path: 输出图片路径
 * - params: 旋转参数
 *
 * # 返回
 * 成功时返回 Ok(())，失败时返回错误信息
 */
pub fn rotate_image(
    input_path: String,
    output_path: String,
    params: RotateParams,
) -> Result<(), ImageError> {
    // 打开图片
    let img = image::open(&input_path)?;

    // 根据角度旋转
    let rotated_img: DynamicImage = match params.angle {
        0 => img,
        90 => {
            let rotated = image::imageops::rotate90(&img);
            DynamicImage::ImageRgba8(rotated)
        }
        180 => {
            let rotated = image::imageops::rotate180(&img);
            DynamicImage::ImageRgba8(rotated)
        }
        270 => {
            let rotated = image::imageops::rotate270(&img);
            DynamicImage::ImageRgba8(rotated)
        }
        _ => {
            return Err(ImageError {
                message: format!("不支持的旋转角度: {}, 仅支持 0, 90, 180, 270", params.angle),
                error_type: "InvalidRotateAngle".to_string(),
            })
        }
    };

    // 保存旋转后的图片
    rotated_img.save(&output_path)?;

    Ok(())
}
