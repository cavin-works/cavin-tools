use image::{DynamicImage, Rgba, RgbaImage};
use super::types::{Annotation, EditParams};
#[cfg(test)]
use super::types::CropRect;

/// 编辑管线核心
///
/// 处理顺序：rotate → flip → crop → brighten → adjust_contrast → huerotate
/// → saturate → blur → unsharpen → grayscale → invert → annotations
/// （Option 为 None/0 时跳过对应步骤）。
///
/// 裁剪在旋转/翻转之后应用：前端裁剪框直接绘制在"已旋转"的预览上，
/// 坐标系与预览一致，前端无需做旋转坐标映射。
///
/// `scale` 用于预览：blur/sharpen 的 sigma 按比例缩放（几何/色彩参数不缩放，
/// crop/annotation 坐标由调用方按 scale 预换算后传入）。
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

    // 裁剪（越界坐标收敛到图像范围内）；标注与裁剪同处旋转后坐标系，记录原点供绘制时平移
    let mut crop_offset = (0u32, 0u32);
    if let Some(crop) = &params.crop {
        let x = crop.x.min(img.width().saturating_sub(1));
        let y = crop.y.min(img.height().saturating_sub(1));
        let width = crop.width.min(img.width() - x).max(1);
        let height = crop.height.min(img.height() - y).max(1);
        img = img.crop_imm(x, y, width, height);
        crop_offset = (x, y);
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
    if let Some(saturation) = params.saturation {
        if saturation != 0.0 {
            img = saturate(img, saturation);
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

    // 标注（管线最后：标注颜色不受灰度/反色影响）
    draw_annotations(&mut img, &params.annotations, crop_offset);

    img
}

/// 饱和度调整（近似算法）：factor = saturation/100 ∈ [-1,1]，
/// 各通道沿 (通道值 - luma) 方向插值——factor<0 向 luma 收敛（-100 即灰度），
/// >0 远离 luma（更鲜艳）。不做完整 HSV 往返，与 brighten 的量纲一致，视觉近似即可。
fn saturate(img: DynamicImage, saturation: f32) -> DynamicImage {
    let factor = saturation / 100.0;
    let mut rgba = img.to_rgba8();
    for pixel in rgba.pixels_mut() {
        let [r, g, b, ..] = pixel.0;
        let luma = 0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32;
        for i in 0..3 {
            let c = pixel.0[i] as f32;
            pixel.0[i] = (c + (c - luma) * factor).round().clamp(0.0, 255.0) as u8;
        }
    }
    DynamicImage::ImageRgba8(rgba)
}

/// Bresenham 直线（image 0.24 无绘制原语且不引入 imageproc，此处越界像素直接跳过）
fn draw_line(buf: &mut RgbaImage, x0: f64, y0: f64, x1: f64, y1: f64, color: Rgba<u8>) {
    let (mut x, mut y) = (x0.round() as i64, y0.round() as i64);
    let (x1, y1) = (x1.round() as i64, y1.round() as i64);
    let dx = (x1 - x).abs();
    let dy = -(y1 - y).abs();
    let sx = if x < x1 { 1 } else { -1 };
    let sy = if y < y1 { 1 } else { -1 };
    let mut err = dx + dy;
    let (w, h) = (buf.width() as i64, buf.height() as i64);
    loop {
        if x >= 0 && y >= 0 && x < w && y < h {
            buf.put_pixel(x as u32, y as u32, color);
        }
        if x == x1 && y == y1 {
            break;
        }
        let e2 = 2 * err;
        if e2 >= dy {
            err += dy;
            x += sx;
        }
        if e2 <= dx {
            err += dx;
            y += sy;
        }
    }
}

/// 粗线：沿垂直方向排布 stroke 条平行 1px 线（宽约 stroke px）
fn draw_thick_line(
    buf: &mut RgbaImage,
    x0: f64,
    y0: f64,
    x1: f64,
    y1: f64,
    color: Rgba<u8>,
    stroke: u32,
) {
    let (dx, dy) = (x1 - x0, y1 - y0);
    let len = (dx * dx + dy * dy).sqrt();
    if len < 0.5 {
        draw_line(buf, x0, y0, x0, y0, color);
        return;
    }
    let (nx, ny) = (-dy / len, dx / len);
    for i in 0..stroke {
        let off = i as f64 - (stroke as f64 - 1.0) / 2.0;
        draw_line(
            buf,
            x0 + nx * off,
            y0 + ny * off,
            x1 + nx * off,
            y1 + ny * off,
            color,
        );
    }
}

/// 箭头端头两条 45° 短线端点（unit 向量旋转 ±135° 后按 len 外推）
fn barbs(
    tip: (f64, f64),
    other: (f64, f64),
    len: f64,
) -> [(f64, f64); 2] {
    let (dx, dy) = (tip.0 - other.0, tip.1 - other.1);
    let l = (dx * dx + dy * dy).sqrt().max(1.0);
    let (ux, uy) = (dx / l, dy / l);
    let c = std::f64::consts::FRAC_1_SQRT_2;
    [
        (tip.0 - c * (ux + uy) * len, tip.1 + c * (ux - uy) * len),
        (tip.0 + c * (uy - ux) * len, tip.1 - c * (ux + uy) * len),
    ]
}

/// 管线末端绘制标注。标注坐标与裁剪同处旋转/翻转后的原图坐标系，
/// 裁剪之后绘制，故需按裁剪原点 crop_offset 平移回裁剪后帧；越界部分自动裁掉。
fn draw_annotations(img: &mut DynamicImage, annotations: &[Annotation], crop_offset: (u32, u32)) {
    if annotations.is_empty() {
        return;
    }
    // 复用拼图工具的 hex 颜色解析（#RRGGBB，非法回退白色）
    use crate::image_collage::layout::background_color;

    let mut buf = img.to_rgba8();
    let (iw, ih) = (buf.width() as i64, buf.height() as i64);
    let (ox, oy) = (crop_offset.0 as i64, crop_offset.1 as i64);

    for ann in annotations {
        let color = background_color(&ann.color);
        let x = ann.x as i64 - ox;
        let y = ann.y as i64 - oy;
        let x1 = x + ann.width as i64;
        let y1 = y + ann.height as i64;
        match ann.kind.as_str() {
            // 高亮：半透明填充，dst = dst*(1-a) + color*a
            "highlight" => {
                const A: f32 = 0.35;
                let (fx0, fy0) = (x.max(0) as u32, y.max(0) as u32);
                let (fx1, fy1) = (x1.min(iw).max(0) as u32, y1.min(ih).max(0) as u32);
                for py in fy0..fy1 {
                    for px in fx0..fx1 {
                        let p = buf.get_pixel_mut(px, py);
                        for i in 0..3 {
                            p.0[i] =
                                (p.0[i] as f32 * (1.0 - A) + color.0[i] as f32 * A).round() as u8;
                        }
                    }
                }
            }
            // 箭头：主干 + 两端各两条 45° 短线（双向箭头，短线长 = stroke*4）
            "arrow" => {
                let (s, e) = if ann.flip {
                    ((x1 as f64, y as f64), (x as f64, y1 as f64))
                } else {
                    ((x as f64, y as f64), (x1 as f64, y1 as f64))
                };
                draw_thick_line(&mut buf, s.0, s.1, e.0, e.1, color, ann.stroke);
                let barb_len = (ann.stroke * 4) as f64;
                for (tip, other) in [(e, s), (s, e)] {
                    for b in barbs(tip, other, barb_len) {
                        draw_thick_line(&mut buf, tip.0, tip.1, b.0, b.1, color, ann.stroke);
                    }
                }
            }
            // 矩形（默认分支）：四条边
            _ => {
                let (xf, yf, x1f, y1f) = (x as f64, y as f64, x1 as f64, y1 as f64);
                draw_thick_line(&mut buf, xf, yf, x1f, yf, color, ann.stroke);
                draw_thick_line(&mut buf, xf, y1f, x1f, y1f, color, ann.stroke);
                draw_thick_line(&mut buf, xf, yf, xf, y1f, color, ann.stroke);
                draw_thick_line(&mut buf, x1f, yf, x1f, y1f, color, ann.stroke);
            }
        }
    }
    *img = DynamicImage::ImageRgba8(buf);
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
            saturation: None,
            annotations: Vec::new(),
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

    // 彩色渐变测试图（含低饱和与高饱和像素）
    fn colorful() -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_fn(8, 8, |x, y| {
            Rgba([(x * 35) as u8, (y * 25) as u8, 128, 255])
        }))
    }

    #[test]
    fn test_saturation_zero_is_noop() {
        let img = colorful();
        let mut params = default_params();
        params.saturation = Some(0.0);
        let out = apply_edits(img.clone(), &params, 1.0);
        assert_eq!(out.as_bytes(), img.as_bytes());
    }

    #[test]
    fn test_saturation_minus_100_is_grayscale() {
        let mut params = default_params();
        params.saturation = Some(-100.0);
        let out = apply_edits(colorful(), &params, 1.0);
        let rgba = out.to_rgba8();
        for p in rgba.pixels() {
            // 向 luma 收敛后三通道相等（容差 1 以吸收浮点取整）
            assert!((p.0[0] as i32 - p.0[1] as i32).abs() <= 1);
            assert!((p.0[1] as i32 - p.0[2] as i32).abs() <= 1);
        }
    }

    #[test]
    fn test_saturation_positive_is_more_saturated() {
        // 偏红像素 (210, 70, 40)：+100 后红通道升高、蓝通道降低（离 luma 更远）
        let img = DynamicImage::ImageRgba8(RgbaImage::from_pixel(
            4,
            4,
            Rgba([210, 70, 40, 255]),
        ));
        let mut params = default_params();
        params.saturation = Some(100.0);
        let out = apply_edits(img, &params, 1.0).to_rgba8();
        let p = out.get_pixel(1, 1);
        assert!(p.0[0] >= 210);
        assert!(p.0[2] <= 40);
        assert!(p.0[0] - p.0[2] > 210 - 40);
    }

    fn annotation(kind: &str) -> Annotation {
        Annotation {
            kind: kind.to_string(),
            x: 2,
            y: 2,
            width: 10,
            height: 10,
            color: "#00FF00".to_string(),
            stroke: 2,
            flip: false,
        }
    }

    fn solid_red(size: u32) -> DynamicImage {
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(
            size,
            size,
            Rgba([255, 0, 0, 255]),
        ))
    }

    #[test]
    fn test_rect_annotation_draws_border_only() {
        let mut params = default_params();
        params.annotations = vec![annotation("rect")];
        let out = apply_edits(solid_red(20), &params, 1.0).to_rgba8();
        let green = Rgba([0, 255, 0, 255]);
        let red = Rgba([255, 0, 0, 255]);
        // 边框像素变色（对角线起点 (2,2) 与边中点 (7,2)）
        assert_eq!(*out.get_pixel(2, 2), green);
        assert_eq!(*out.get_pixel(7, 2), green);
        // 内部与外部保持原色
        assert_eq!(*out.get_pixel(7, 7), red);
        assert_eq!(*out.get_pixel(18, 18), red);
    }

    #[test]
    fn test_highlight_annotation_blends_inside() {
        let mut params = default_params();
        let mut ann = annotation("highlight");
        ann.color = "#0000FF".to_string();
        ann.x = 5;
        ann.y = 5;
        params.annotations = vec![ann];
        let out = apply_edits(solid_red(20), &params, 1.0).to_rgba8();
        // 内部为混合色：255*0.65 + 0*0.35 = 166，0*0.65 + 255*0.35 = 89
        assert_eq!(*out.get_pixel(10, 10), Rgba([166, 0, 89, 255]));
        // 外部保持原色
        assert_eq!(*out.get_pixel(2, 2), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn test_arrow_annotation_draws_shaft() {
        let mut params = default_params();
        params.annotations = vec![annotation("arrow")];
        let out = apply_edits(solid_red(20), &params, 1.0).to_rgba8();
        // 主干沿 (2,2)→(12,12) 对角线，中点应为标注色
        assert_eq!(*out.get_pixel(7, 7), Rgba([0, 255, 0, 255]));
        // 远离主干与端头的区域保持原色
        assert_eq!(*out.get_pixel(18, 18), Rgba([255, 0, 0, 255]));
    }

    #[test]
    fn test_annotation_shifted_by_crop_offset() {
        // 标注在旋转后原图坐标系：裁剪 (5,5) 起 10x10 后，标注 (7,7) 应落在裁剪帧的 (2,2)
        let mut params = default_params();
        params.crop = Some(CropRect { x: 5, y: 5, width: 10, height: 10 });
        params.annotations = vec![annotation("rect")];
        let out = apply_edits(solid_red(20), &params, 1.0).to_rgba8();
        assert_eq!(out.dimensions(), (10, 10));
        assert_eq!(*out.get_pixel(2, 2), Rgba([0, 255, 0, 255]));
    }

    #[test]
    fn test_annotation_drawn_after_grayscale() {
        let mut params = default_params();
        params.grayscale = true;
        params.annotations = vec![annotation("rect")];
        let out = apply_edits(solid_red(20), &params, 1.0).to_rgba8();
        // 灰度在标注之前：边框保持标注原色（绿），非纯灰
        assert_eq!(*out.get_pixel(2, 2), Rgba([0, 255, 0, 255]));
    }
}
