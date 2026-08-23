use image::Rgba;

use crate::image_collage::types::CollageParams;

/// 单元格区域（原图尺寸坐标系，预览时由调用方整体乘 scale）
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Rect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// 行/列模板统一目标边长上限，防止超大原图撑爆画布
const MAX_STRIP_SIDE: u32 = 1200;

/// 在"原图尺寸"域上计算布局：返回 (画布宽, 画布高, 每图单元格)。
/// 布局与缩放解耦——预览时调用方将画布与所有 Rect 整体乘 scale，
/// 保证预览与导出的几何完全一致。
///
/// - row: 统一高度 h = min(各图高度, 1200)，每图宽 = h * 原宽/原高
/// - column: 与 row 对称（统一宽度）
/// - grid-2 / grid-3: 单元格取所有图平均宽高（取整），末行不满照常分配（留背景）
pub fn cell_rects(
    template: &str,
    cell_sizes: &[(u32, u32)],
    params: &CollageParams,
) -> Result<(u32, u32, Vec<Rect>), String> {
    if cell_sizes.is_empty() {
        return Err("拼贴至少需要一张图片".to_string());
    }

    let gap = params.gap;
    let margin = params.margin;

    match template {
        "row" => {
            let h = cell_sizes.iter().map(|s| s.1).min().unwrap().min(MAX_STRIP_SIDE);
            let widths: Vec<u32> = cell_sizes
                .iter()
                .map(|&(w0, h0)| fit_side(w0, h0, h).max(1))
                .collect();
            let canvas_w = 2 * margin + widths.iter().sum::<u32>() + (widths.len() as u32 - 1) * gap;
            let canvas_h = 2 * margin + h;
            let rects = widths
                .iter()
                .scan(margin, |x, &w| {
                    let rect = Rect { x: *x, y: margin, width: w, height: h };
                    *x += w + gap;
                    Some(rect)
                })
                .collect();
            Ok((canvas_w, canvas_h, rects))
        }
        "column" => {
            let w = cell_sizes.iter().map(|s| s.0).min().unwrap().min(MAX_STRIP_SIDE);
            let heights: Vec<u32> = cell_sizes
                .iter()
                .map(|&(w0, h0)| fit_side(h0, w0, w).max(1))
                .collect();
            let canvas_h = 2 * margin + heights.iter().sum::<u32>() + (heights.len() as u32 - 1) * gap;
            let canvas_w = 2 * margin + w;
            let rects = heights
                .iter()
                .scan(margin, |y, &h| {
                    let rect = Rect { x: margin, y: *y, width: w, height: h };
                    *y += h + gap;
                    Some(rect)
                })
                .collect();
            Ok((canvas_w, canvas_h, rects))
        }
        "grid-2" | "grid-3" => {
            let cols: u32 = if template == "grid-2" { 2 } else { 3 };
            let n = cell_sizes.len() as u32;
            let rows = n.div_ceil(cols);
            // 单元格 = 所有图平均宽高（取整），所有格子统一尺寸
            let cell_w = (cell_sizes.iter().map(|s| s.0 as u64).sum::<u64>() / n as u64) as u32;
            let cell_h = (cell_sizes.iter().map(|s| s.1 as u64).sum::<u64>() / n as u64) as u32;
            let (cell_w, cell_h) = (cell_w.max(1), cell_h.max(1));
            let canvas_w = 2 * margin + cols * cell_w + (cols - 1) * gap;
            let canvas_h = 2 * margin + rows * cell_h + (rows - 1) * gap;
            let rects = (0..n)
                .map(|i| {
                    let (row, col) = (i / cols, i % cols);
                    Rect {
                        x: margin + col * (cell_w + gap),
                        y: margin + row * (cell_h + gap),
                        width: cell_w,
                        height: cell_h,
                    }
                })
                .collect();
            Ok((canvas_w, canvas_h, rects))
        }
        _ => Err(format!("未知拼贴模板: {}", template)),
    }
}

/// 按比例换算边长：side * target / base，四舍五入
fn fit_side(side: u32, base: u32, target: u32) -> u32 {
    (side as f64 * target as f64 / base as f64).round() as u32
}

/// 背景色解析："transparent" -> 全透明，否则按 #RRGGBB / #RRGGBBAA 解析，非法输入回退白色
pub fn background_color(s: &str) -> Rgba<u8> {
    if s == "transparent" {
        return Rgba([0, 0, 0, 0]);
    }
    let hex = s.strip_prefix('#').unwrap_or(s);
    // 非 ASCII 输入按字节切片会 panic,先排除
    if !hex.is_ascii() {
        return Rgba([255, 255, 255, 255]);
    }
    let parse = |range: std::ops::Range<usize>| u8::from_str_radix(&hex[range], 16).ok();
    match hex.len() {
        6 => match (parse(0..2), parse(2..4), parse(4..6)) {
            (Some(r), Some(g), Some(b)) => Rgba([r, g, b, 255]),
            _ => Rgba([255, 255, 255, 255]),
        },
        8 => match (parse(0..2), parse(2..4), parse(4..6), parse(6..8)) {
            (Some(r), Some(g), Some(b), Some(a)) => Rgba([r, g, b, a]),
            _ => Rgba([255, 255, 255, 255]),
        },
        _ => Rgba([255, 255, 255, 255]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params(template: &str, gap: u32, margin: u32) -> CollageParams {
        CollageParams {
            template: template.to_string(),
            gap,
            margin,
            background: "#ffffff".to_string(),
        }
    }

    #[test]
    fn test_row_layout() {
        // 统一高度取较小者 200；宽按比例 100 / 300
        let (w, h, rects) =
            cell_rects("row", &[(100, 200), (300, 200)], &params("row", 5, 10)).unwrap();
        assert_eq!((w, h), (2 * 10 + 400 + 5, 2 * 10 + 200));
        assert_eq!(
            rects,
            vec![
                Rect { x: 10, y: 10, width: 100, height: 200 },
                Rect { x: 115, y: 10, width: 300, height: 200 },
            ]
        );
    }

    #[test]
    fn test_column_layout() {
        let (w, h, rects) =
            cell_rects("column", &[(200, 100), (200, 300)], &params("column", 5, 10)).unwrap();
        assert_eq!((w, h), (2 * 10 + 200, 2 * 10 + 400 + 5));
        assert_eq!(
            rects,
            vec![
                Rect { x: 10, y: 10, width: 200, height: 100 },
                Rect { x: 10, y: 115, width: 200, height: 300 },
            ]
        );
    }

    #[test]
    fn test_row_single_image_no_gap() {
        // n=1 时间距不参与画布尺寸
        let (w, h, rects) = cell_rects("row", &[(100, 50)], &params("row", 7, 3)).unwrap();
        assert_eq!((w, h), (106, 56));
        assert_eq!(rects, vec![Rect { x: 3, y: 3, width: 100, height: 50 }]);
    }

    #[test]
    fn test_row_height_cap() {
        // 超过 1200 的图被压到 1200，宽按比例
        let (w, h, rects) = cell_rects("row", &[(1000, 2400)], &params("row", 0, 0)).unwrap();
        assert_eq!((w, h), (500, 1200));
        assert_eq!(rects[0].height, 1200);
    }

    #[test]
    fn test_grid_2_five_images_three_rows() {
        // 平均宽高 900/5=180，n=5 -> rows=3，末行仅 1 格
        let sizes = vec![(100, 100), (300, 300), (100, 100), (300, 300), (100, 100)];
        let (w, h, rects) = cell_rects("grid-2", &sizes, &params("grid-2", 4, 8)).unwrap();
        assert_eq!((w, h), (2 * 8 + 2 * 180 + 4, 2 * 8 + 3 * 180 + 2 * 4));
        assert_eq!(rects.len(), 5);
        // 第 5 张落在第 3 行第 1 列
        assert_eq!(rects[4], Rect { x: 8, y: 8 + 2 * 184, width: 180, height: 180 });
        // 第 2 张在第 1 行第 2 列
        assert_eq!(rects[1], Rect { x: 8 + 184, y: 8, width: 180, height: 180 });
    }

    #[test]
    fn test_grid_3_columns() {
        let sizes = vec![(10, 10), (10, 10), (10, 10), (10, 10)];
        let (w, h, rects) = cell_rects("grid-3", &sizes, &params("grid-3", 0, 0)).unwrap();
        assert_eq!((w, h), (3 * 10, 2 * 10)); // rows = ceil(4/3) = 2
        assert_eq!(rects[2], Rect { x: 20, y: 0, width: 10, height: 10 });
        assert_eq!(rects[3], Rect { x: 0, y: 10, width: 10, height: 10 });
    }

    #[test]
    fn test_gap_margin_affect_canvas() {
        let sizes = vec![(100, 100), (100, 100)];
        let (w1, h1, _) = cell_rects("row", &sizes, &params("row", 0, 0)).unwrap();
        let (w2, h2, _) = cell_rects("row", &sizes, &params("row", 6, 20)).unwrap();
        assert_eq!(w2 - w1, 6 + 2 * 20); // +1 个 gap + 两侧 margin
        assert_eq!(h2 - h1, 2 * 20);
    }

    #[test]
    fn test_empty_and_invalid_template() {
        assert!(cell_rects("row", &[], &params("row", 0, 0)).is_err());
        assert!(cell_rects("circle", &[(1, 1)], &params("circle", 0, 0)).is_err());
    }

    #[test]
    fn test_background_color() {
        assert_eq!(background_color("transparent"), Rgba([0, 0, 0, 0]));
        assert_eq!(background_color("#ff0000"), Rgba([255, 0, 0, 255]));
        assert_eq!(background_color("#ff000080"), Rgba([255, 0, 0, 128]));
        // 非法输入回退白色
        assert_eq!(background_color("#zzzzzz"), Rgba([255, 255, 255, 255]));
        assert_eq!(background_color("red"), Rgba([255, 255, 255, 255]));
    }
}
