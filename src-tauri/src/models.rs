use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoInfo {
    pub path: String,
    pub filename: String,
    pub duration: f64,  // 秒
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub bitrate: u64,
    pub file_size: u64,
    pub format: String,
}

/// 队列操作
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueOperation {
    /// 操作类型
    #[serde(rename = "type")]
    pub operation_type: String,
    /// 操作名称
    pub name: String,
    /// 操作参数（JSON格式）
    pub params: Value,
}
