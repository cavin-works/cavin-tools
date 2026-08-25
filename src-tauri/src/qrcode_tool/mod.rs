//! 二维码生成工具：文本 → PNG（预览 base64 data URL / 写入文件）

use base64::Engine;
use image::{ImageFormat, RgbaImage};
use qrcode::{Color, EcLevel, QrCode};
use tokio::task::spawn_blocking;

use crate::image_collage::layout::background_color;

/// 渲染二维码画布：M 纠错等级，四周 4 模块静区，
/// 每模块像素 p = size / (模块数 + 8)，余数留白（实际边长 ≤ size）
fn render_qr(text: &str, size: u32, dark: &str, light: &str) -> Result<RgbaImage, String> {
    if text.is_empty() {
        return Err("二维码内容不能为空".to_string());
    }
    let code = QrCode::with_error_correction_level(text, EcLevel::M)
        .map_err(|e| format!("生成二维码失败（内容可能过长）: {}", e))?;
    let n = code.width();
    let total = (n + 8) as u32; // 两侧各 4 模块静区
    let px = (size / total).max(1);
    let side = px * total;

    let dark = background_color(dark);
    let mut img = RgbaImage::from_pixel(side, side, background_color(light));

    // to_colors() 按行优先返回全部模块颜色
    for (i, color) in code.to_colors().iter().enumerate() {
        if *color == Color::Dark {
            let x = ((i % n) as u32 + 4) * px;
            let y = ((i / n) as u32 + 4) * px;
            for dy in 0..px {
                for dx in 0..px {
                    img.put_pixel(x + dx, y + dy, dark);
                }
            }
        }
    }

    Ok(img)
}

/// 生成二维码并编码为 PNG base64 data URL（预览用）
fn render_qr_data_url(text: &str, size: u32, dark: &str, light: &str) -> Result<String, String> {
    let img = render_qr(text, size, dark, light)?;
    let mut buffer = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buffer, ImageFormat::Png)
        .map_err(|e| format!("编码 PNG 失败: {}", e))?;
    Ok(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(buffer.into_inner())
    ))
}

/// 生成二维码预览，返回 PNG base64 data URL
#[tauri::command]
pub async fn generate_qr_png(
    text: String,
    size: u32,
    dark: String,
    light: String,
) -> Result<String, String> {
    spawn_blocking(move || render_qr_data_url(&text, size, &dark, &light))
        .await
        .map_err(|e| format!("异步任务执行失败: {}", e))?
}

/// 生成二维码并写入指定路径的 PNG 文件，返回实际输出路径
#[tauri::command]
pub async fn save_qr(
    text: String,
    size: u32,
    dark: String,
    light: String,
    path: String,
) -> Result<String, String> {
    spawn_blocking(move || {
        let img = render_qr(&text, size, &dark, &light)?;
        let mut file =
            std::fs::File::create(&path).map_err(|e| format!("创建输出文件失败: {}", e))?;
        img.write_to(&mut file, ImageFormat::Png)
            .map_err(|e| format!("保存 PNG 失败: {}", e))?;
        Ok(path)
    })
    .await
    .map_err(|e| format!("异步任务执行失败: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_returns_data_url_prefix() {
        let url = render_qr_data_url("hi", 512, "#000000", "#ffffff").unwrap();
        assert!(url.starts_with("data:image/png;base64,"), "应以 data URL 前缀开头");
    }

    #[test]
    fn test_short_text_succeeds() {
        assert!(render_qr("hi", 256, "#000000", "#ffffff").is_ok());
    }

    #[test]
    fn test_empty_text_errors() {
        assert!(render_qr("", 256, "#000000", "#ffffff").is_err());
    }

    #[test]
    fn test_image_size_within_bounds() {
        // 版本 1 为 21 模块，total = 29，px = 256/29 = 8，边长 232 ≤ 256
        let img = render_qr("hi", 256, "#000000", "#ffffff").unwrap();
        assert_eq!(img.width(), img.height());
        assert!(img.width() <= 256 && img.width() > 0);
    }
}
