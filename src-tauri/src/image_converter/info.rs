use image::GenericImageView;
use crate::models::ImageInfo;

/// 获取图片信息
///
/// # Arguments
/// * `path` - 图片文件路径
///
/// # Returns
/// 返回图片的详细信息
pub fn get_image_info(path: String) -> Result<ImageInfo, String> {
    // 打开图片
    let img = image::open(&path)
        .map_err(|e| format!("无法打开图片: {}", e))?;

    // 获取尺寸
    let (width, height) = img.dimensions();

    // 获取颜色类型
    let color_type = format!("{:?}", img.color());

    // 解析路径信息
    let path_obj = std::path::Path::new(&path);
    let filename = path_obj.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // 获取文件大小
    let file_size = std::fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 获取格式
    let format = path_obj.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_uppercase();

    Ok(ImageInfo {
        path,
        filename,
        width,
        height,
        format,
        file_size,
        color_type,
    })
}
