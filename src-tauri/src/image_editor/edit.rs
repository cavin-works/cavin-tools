use image::DynamicImage;
use super::types::EditParams;
#[cfg(test)]
use super::types::CropRect;

/// 编辑管线核心
///
/// 处理顺序：rotate → flip → crop → brighten → adjust_contrast → huerotate
/// → blur → unsharpen → grayscale → invert（Option 为 None/0 时跳过对应步骤）。
///
/// 裁剪在旋转/翻转之后应用：前端裁剪框直接绘制在"已旋转"的预览上，
/// 坐标系与预览一致，前端无需做旋转坐标映射。
///
/// `scale` 用于预览：blur/sharpen 的 sigma 按比例缩放（几何/色彩参数不缩放，
/// crop 坐标由调用方按 scale 预换算后传入）。
pub fn apply_edits(img: DynamicImage, params: &EditParams, scale: f64) -> DynamicImage {
    let mut img = img;

    // 旋转
    img = match params.rotation % 360 {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => img,
    };

    // 翻转
    if params.flip_h {
        img = img.fliph();
    }
    if params.flip_v {
        img = img.flipv();
    }

    // 裁剪（越界坐标收敛到图像范围内）
    if let Some(crop) = &params.crop {
        let x = crop.x.min(img.width().saturating_sub(1));
        let y = crop.y.min(img.height().saturating_sub(1));
        let width = crop.width.min(img.width() - x).max(1);
        let height = crop.height.min(img.height() - y).max(1);
        img = img.crop_imm(x, y, width, height);
    }

    // 色彩调整
    if let Some(brightness) = params.brightness {
        if brightness != 0 {
            img = img.brighten(brightness);
        }
    }
    if let Some(contrast) = params.contrast {
        if contrast != 0.0 {
            img = img.adjust_contrast(contrast);
        }
    }
    if let Some(hue) = params.hue {
        if hue != 0 {
            img = img.huerotate(hue);
        }
    }

    // 模糊/锐化（预览时 sigma 按 scale 缩放）
    if let Some(sigma) = params.blur {
        if sigma > 0.0 {
            img = img.blur((sigma as f64 * scale) as f32);
        }
    }
    if let Some(sigma) = params.sharpen {
        if sigma > 0.0 {
            img = img.unsharpen((sigma as f64 * scale) as f32, 10);
        }
    }

    // 灰度/反色
    if params.grayscale {
        img = img.grayscale();
    }
    if params.invert {
        img.invert();
    }

    img
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{GenericImageView, Rgba, RgbaImage};

    fn default_params() -> EditParams {
        EditParams {
            crop: None,
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
        }
    }

    /// 左半红右半蓝的 10x10 测试图
    fn two_tone() -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_fn(10, 10, |x, _| {
            if x < 5 {
                Rgba([255, 0, 0, 255])
            } else {
                Rgba([0, 0, 255, 255])
            }
        }))
    }

    #[test]
    fn test_crop_resizes_and_offsets() {
        let mut params = default_params();
        params.crop = Some(CropRect { x: 5, y: 2, width: 4, height: 5 });
        let out = apply_edits(two_tone(), &params, 1.0);
        // 尺寸正确
        assert_eq!((out.width(), out.height()), (4, 5));
        // 偏移正确：x>=5 的区域应为蓝色
        assert_eq!(out.get_pixel(0, 0), Rgba([0, 0, 255, 255]));
        assert_eq!(out.get_pixel(3, 4), Rgba([0, 0, 255, 255]));
    }

    #[test]
    fn test_rotate90_swaps_dims_and_pixels() {
        // 2x1 左红右蓝 → 顺时针 90° 后为 1x2 上红下蓝
        let img = DynamicImage::ImageRgba8(RgbaImage::from_fn(2, 1, |x, _| {
            if x == 0 { Rgba([255, 0, 0, 255]) } else { Rgba([0, 0, 255, 255]) }
        }));
        let mut params = default_params();
        params.rotation = 90;
        let out = apply_edits(img, &params, 1.0);
        assert_eq!((out.width(), out.height()), (1, 2));
        assert_eq!(out.get_pixel(0, 0), Rgba([255, 0, 0, 255]));
        assert_eq!(out.get_pixel(0, 1), Rgba([0, 0, 255, 255]));
    }

    #[test]
    fn test_flips_mirror_pixels() {
        let img = DynamicImage::ImageRgba8(RgbaImage::from_fn(2, 1, |x, _| {
            if x == 0 { Rgba([255, 0, 0, 255]) } else { Rgba([0, 0, 255, 255]) }
        }));
        // 水平翻转：左红右蓝 → 左蓝右红
        let mut params = default_params();
        params.flip_h = true;
        let out = apply_edits(img.clone(), &params, 1.0);
        assert_eq!(out.get_pixel(0, 0), Rgba([0, 0, 255, 255]));
        assert_eq!(out.get_pixel(1, 0), Rgba([255, 0, 0, 255]));

        // 垂直翻转（1x2 上红下蓝 → 上蓝下红）
        let img_v = DynamicImage::ImageRgba8(RgbaImage::from_fn(1, 2, |_, y| {
            if y == 0 { Rgba([255, 0, 0, 255]) } else { Rgba([0, 0, 255, 255]) }
        }));
        let mut params_v = default_params();
        params_v.flip_v = true;
        let out_v = apply_edits(img_v, &params_v, 1.0);
        assert_eq!(out_v.get_pixel(0, 0), Rgba([0, 0, 255, 255]));
        assert_eq!(out_v.get_pixel(0, 1), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn test_identity_params_are_noop() {
        // 全默认参数 + scale=1 不改变图像（尺寸与像素完全一致）
        let img = DynamicImage::ImageRgba8(RgbaImage::from_fn(8, 6, |x, y| {
            Rgba([(x * 30) as u8, (y * 40) as u8, 90, 255])
        }));
        let out = apply_edits(img.clone(), &default_params(), 1.0);
        assert_eq!(out.dimensions(), img.dimensions());
        assert_eq!(out.as_bytes(), img.as_bytes());
    }

    #[test]
    fn test_blur_sigma_scales_with_preview_scale() {
        // 预览缩放 0.5 时 sigma 2.0 等效于全尺寸的 sigma 1.0
        let img = DynamicImage::ImageRgba8(RgbaImage::from_fn(32, 32, |x, y| {
            Rgba([(x * 8) as u8, (y * 8) as u8, 128, 255])
        }));
        let mut params_a = default_params();
        params_a.blur = Some(2.0);
        let mut params_b = default_params();
        params_b.blur = Some(1.0);

        let scaled = apply_edits(img.clone(), &params_a, 0.5);
        let unscaled = apply_edits(img.clone(), &params_b, 1.0);
        assert_eq!(scaled.as_bytes(), unscaled.as_bytes());

        // 未缩放的 sigma 2.0 应明显强于 sigma 1.0
        let full = apply_edits(img, &params_a, 1.0);
        assert_ne!(full.as_bytes(), unscaled.as_bytes());
    }
}
