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
    /// 饱和度 -100..100（0 跳过）
    #[serde(default)]
    pub saturation: Option<f32>,
    /// 标注列表（管线最后绘制，预览时坐标/线宽由调用方按 scale 预换算）
    #[serde(default)]
    pub annotations: Vec<Annotation>,
    /// 文字标注列表（管线最末叠加；前端离屏 canvas 渲染的 PNG。
    /// 预览与导出均传入：预览时前端按缩放比渲染小号 PNG，
    /// 后端仅按 scale 换算锚点坐标；导出 scale=1 原样使用）
    #[serde(default)]
    pub text_overlays: Vec<TextOverlay>,
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

/// 标注（坐标与裁剪同处"旋转/翻转后的原图坐标系"，裁剪后绘制时按裁剪原点平移）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    /// "rect" | "arrow" | "highlight"
    pub kind: String,
    pub x: u32,
    pub y: u32,
    /// arrow 为对角点矩形包络（对角线两端为箭头起止点）
    pub width: u32,
    pub height: u32,
    /// "#RRGGBB"（复用 image_collage 的背景色 hex 解析，非法回退白色）
    pub color: String,
    /// 线宽 2|4|8
    pub stroke: u32,
    /// arrow 专用：true 时对角线为右上→左下（默认左上→右下）
    #[serde(default)]
    pub flip: bool,
}

/// 文字标注：前端渲染好的 PNG（base64，不带 data: 前缀），
/// 坐标为 PNG 左上角，与标注同处"旋转/翻转后的原图坐标系"（裁剪后按原点平移）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextOverlay {
    pub x: u32,
    pub y: u32,
    pub png_base64: String,
}
