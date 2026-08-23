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
    // 只读文件头取尺寸，避免整图解码
    let (width, height) = match image::io::Reader::open(&path)
        .map_err(|e| format!("无法打开图片: {}", e))?
        .with_guessed_format()
        .map_err(|e| format!("无法读取图片: {}", e))?
        .into_dimensions()
    {
        Ok(dims) => dims,
        // 个别格式文件头不标准：回退旧的全量解码路径
        Err(_) => image::open(&path)
            .map_err(|e| format!("无法打开图片: {}", e))?
            .dimensions(),
    };

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

    // 文件头不含颜色类型，按格式推断（前端仅声明类型，无实际消费）
    let color_type = match format.as_str() {
        "PNG" | "WEBP" | "GIF" | "ICO" => "Rgba8",
        "JPG" | "JPEG" | "BMP" | "TIFF" => "Rgb8",
        _ => "Unknown",
    }
    .to_string();

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_image_info_reads_dimensions_from_header() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("t.png");
        image::RgbaImage::new(7, 5).save(&path).unwrap();

        let info = get_image_info(path.to_string_lossy().into_owned()).unwrap();
        assert_eq!((info.width, info.height), (7, 5));
        assert_eq!(info.format, "PNG");
        assert_eq!(info.color_type, "Rgba8");
    }
}
