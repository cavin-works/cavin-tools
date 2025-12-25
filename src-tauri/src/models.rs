use serde::{Deserialize, Serialize};

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
