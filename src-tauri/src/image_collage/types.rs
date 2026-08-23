use serde::{Deserialize, Serialize};

/// 拼贴参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollageParams {
    /// 模板 "row" | "column" | "grid-2" | "grid-3"
    pub template: String,
    /// 图片间距 0..64
    pub gap: u32,
    /// 画布外边距
    pub margin: u32,
    /// 背景色 "#RRGGBB" | "#RRGGBBAA" | "transparent"
    pub background: String,
}
