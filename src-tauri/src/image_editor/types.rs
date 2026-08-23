use serde::{Deserialize, Serialize};

/// 编辑参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditParams {
    /// 裁剪区域（应用旋转/翻转后的原图坐标系，预览时坐标由调用方按 scale 预换算）
    pub crop: Option<CropRect>,
    /// 旋转角度 0|90|180|270（顺时针）
    pub rotation: u16,
    /// 水平翻转
    pub flip_h: bool,
    /// 垂直翻转
    pub flip_v: bool,
    /// 亮度 -100..100
    pub brightness: Option<i32>,
    /// 对比度 -100..100
    pub contrast: Option<f32>,
    /// 色相 -180..180
    pub hue: Option<i32>,
    /// 灰度
    pub grayscale: bool,
    /// 反色
    pub invert: bool,
    /// 模糊 sigma 0..10（预览时按 scale 缩放）
    pub blur: Option<f32>,
    /// 锐化强度 0..10（映射到 unsharpen 的 sigma，阈值固定）
    pub sharpen: Option<f32>,
}

/// 裁剪区域
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
