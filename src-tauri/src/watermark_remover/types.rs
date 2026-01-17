use serde::{Deserialize, Serialize};

/// 水印检测信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkInfo {
    /// 是否检测到水印区域
    pub detected: bool,
    /// 水印尺寸 (48 或 96)
    pub watermark_size: u32,
    /// 水印区域起始 X 坐标
    pub region_x: u32,
    /// 水印区域起始 Y 坐标
    pub region_y: u32,
    /// 右边距
    pub margin_right: u32,
    /// 下边距
    pub margin_bottom: u32,
}

/// 去水印参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveParams {
    /// 是否自动检测水印位置（默认 true）
    #[serde(default = "default_auto_detect")]
    pub auto_detect: bool,
    /// 手动指定水印尺寸（可选，48 或 96）
    pub manual_size: Option<u32>,
}

fn default_auto_detect() -> bool {
    true
}

impl Default for RemoveParams {
    fn default() -> Self {
        Self {
            auto_detect: true,
            manual_size: None,
        }
    }
}

/// 去水印结果
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveResult {
    /// 输出文件路径
    pub output_path: String,
    /// 原始文件大小（字节）
    pub original_size: u64,
    /// 处理后文件大小（字节）
    pub processed_size: u64,
    /// 是否成功检测到水印
    pub watermark_detected: bool,
    /// 水印信息
    pub watermark_info: Option<WatermarkInfo>,
}
