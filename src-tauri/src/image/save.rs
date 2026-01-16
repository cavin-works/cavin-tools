/**
 * 图片保存模块
 * 保存编辑后的图片
 */

use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose};

/**
 * 保存编辑后的图片
 *
 * @param original_path 原始图片路径
 * @param image_data Base64 编码的图片数据（不包含 data:image/png;base64, 前缀）
 * @return 保存后的图片路径
 */
pub fn save_edited_image(original_path: String, image_data: String) -> Result<String, String> {
    // 解码 Base64 数据
    let image_bytes = general_purpose::STANDARD
        .decode(&image_data)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    // 生成新文件名
    let original = Path::new(&original_path);
    let parent = original
        .parent()
        .ok_or("无法获取父目录")?;

    let stem = original
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("无法获取文件名")?;

    let extension = original
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png");

    // 生成文件名：原文件名_edited.扩展名
    let new_filename = format!("{}_edited.{}", stem, extension);
    let save_path = parent.join(new_filename);

    // 保存文件
    fs::write(&save_path, image_bytes)
        .map_err(|e| format!("文件保存失败: {}", e))?;

    // 返回保存路径
    Ok(save_path
        .to_str()
        .ok_or("路径转换失败")?
        .to_string())
}
