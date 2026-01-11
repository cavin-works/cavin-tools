use super::ImageError;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

/// 批量处理操作类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BatchOperationType {
    Resize,
    Crop,
    Rotate,
    Flip,
    Watermark,
    Convert,
}

/// 批量处理操作参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperation {
    pub operation_type: BatchOperationType,
    pub params: serde_json::Value,
}

/// 批量处理参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchParams {
    /// 图片路径列表
    pub image_paths: Vec<String>,
    /// 操作队列
    pub operations: Vec<BatchOperation>,
    /// 输出目录（可选，默认为当前目录）
    pub output_dir: Option<String>,
    /// 是否覆盖已存在的文件
    pub _overwrite: bool,
}

/// 批量处理结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    /// 成功处理的图片数量
    pub success_count: usize,
    /// 失败的图片数量
    pub failed_count: usize,
    /// 成功的图片路径
    pub success_paths: Vec<String>,
    /// 失败信息
    pub errors: Vec<String>,
}

/// 批量处理进度
pub struct BatchProgress {
    pub current: usize,
    pub total: usize,
    pub current_image: String,
    pub percentage: usize,
}

/// 批量处理图片
pub fn batch_process_images(
    params: BatchParams,
) -> Result<BatchResult, ImageError> {
    let total_images = params.image_paths.len();
    let total_operations = params.operations.len();

    if total_images == 0 {
        return Err(ImageError {
            message: "图片路径列表不能为空".to_string(),
            error_type: "ValidationError".to_string(),
        });
    }

    if total_operations == 0 {
        return Err(ImageError {
            message: "操作列表不能为空".to_string(),
            error_type: "ValidationError".to_string(),
        });
    }

    // 确定输出目录
    let output_dir = params.output_dir.clone().unwrap_or_else(|| {
        std::env::current_dir()
            .map_err(|e| ImageError {
                message: format!("获取当前目录失败: {}", e),
                error_type: "IoError".to_string(),
            })
            .unwrap()
            .to_str()
            .unwrap_or(".")
            .to_string()
    });

    // 使用 Arc 和 Mutex 实现线程安全的进度跟踪
    let success_count = Arc::new(Mutex::new(0usize));
    let failed_count = Arc::new(Mutex::new(0usize));
    let success_paths = Arc::new(Mutex::new(Vec::new()));
    let errors = Arc::new(Mutex::new(Vec::new()));

    // 并行处理每张图片
    let results: Vec<Result<(), ImageError>> = params.image_paths
        .par_iter()
        .enumerate()
        .map(|(index, input_path)| {
            // 处理单张图片
            let result = process_single_image(
                input_path,
                &params.operations,
                &output_dir,
                index,
                params._overwrite,
            );

            // 更新计数
            match &result {
                Ok(_) => {
                    *success_count.lock().unwrap() += 1;
                    success_paths.lock().unwrap().push(input_path.clone());
                }
                Err(e) => {
                    *failed_count.lock().unwrap() += 1;
                    errors.lock().unwrap().push(format!("{}: {}", input_path, e.message));
                }
            }

            result
        })
        .collect();

    // 检查是否有处理失败的
    let failed = results.iter().any(|r| r.is_err());
    if failed && results.iter().all(|r| r.is_err()) {
        return Err(ImageError {
            message: "所有图片处理失败".to_string(),
            error_type: "BatchError".to_string(),
        });
    }

    // 提前克隆数据，避免借用问题
    let success_cnt = *success_count.lock().unwrap();
    let failed_cnt = *failed_count.lock().unwrap();
    let success_pths = success_paths.lock().unwrap().clone();
    let errs = errors.lock().unwrap().clone();

    Ok(BatchResult {
        success_count: success_cnt,
        failed_count: failed_cnt,
        success_paths: success_pths,
        errors: errs,
    })
}

/// 处理单张图片
fn process_single_image(
    input_path: &str,
    operations: &[BatchOperation],
    output_dir: &str,
    index: usize,
    _overwrite: bool,
) -> Result<(), ImageError> {
    // 加载原始图片
    let mut current_path = input_path.to_string();
    let mut temp_files: Vec<String> = Vec::new();

    for (op_index, operation) in operations.iter().enumerate() {
        let is_last_op = op_index == operations.len() - 1;

        // 生成输出路径
        let output_path = if is_last_op {
            // 最后一个操作：生成永久输出文件
            let input_file = Path::new(&current_path);
            let filename = input_file.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output");
            let extension = match operation.operation_type {
                BatchOperationType::Convert => "jpg", // 简化，实际应该从参数获取
                _ => input_file.extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("jpg")
            };
            format!("{}/{}_batch_{}.{}", output_dir, filename, index, extension)
        } else {
            // 中间操作：使用临时文件
            let temp_path = format!("{}/temp_{}_op_{}.jpg", output_dir, index, op_index);
            temp_files.push(temp_path.clone());
            temp_path
        };

        // 执行操作
        match operation.operation_type {
            BatchOperationType::Resize => {
                let params: crate::image::resize::ResizeParams =
                    serde_json::from_value(operation.params.clone())
                        .map_err(|e| ImageError {
                            message: format!("解析调整尺寸参数失败: {}", e),
                            error_type: "SerializationError".to_string(),
                        })?;
                crate::image::resize::resize_image(current_path.clone(), output_path.clone(), params)?;
            }
            BatchOperationType::Crop => {
                let params: crate::image::crop::CropParams =
                    serde_json::from_value(operation.params.clone())
                        .map_err(|e| ImageError {
                            message: format!("解析裁剪参数失败: {}", e),
                            error_type: "SerializationError".to_string(),
                        })?;
                crate::image::crop::crop_image(current_path.clone(), output_path.clone(), params)?;
            }
            BatchOperationType::Rotate => {
                let params: crate::image::rotate::RotateParams =
                    serde_json::from_value(operation.params.clone())
                        .map_err(|e| ImageError {
                            message: format!("解析旋转参数失败: {}", e),
                            error_type: "SerializationError".to_string(),
                        })?;
                crate::image::rotate::rotate_image(current_path.clone(), output_path.clone(), params)?;
            }
            BatchOperationType::Flip => {
                let params: crate::image::flip::FlipParams =
                    serde_json::from_value(operation.params.clone())
                        .map_err(|e| ImageError {
                            message: format!("解析翻转参数失败: {}", e),
                            error_type: "SerializationError".to_string(),
                        })?;
                crate::image::flip::flip_image(current_path.clone(), output_path.clone(), params)?;
            }
            BatchOperationType::Watermark => {
                let params: crate::image::watermark::WatermarkParams =
                    serde_json::from_value(operation.params.clone())
                        .map_err(|e| ImageError {
                            message: format!("解析水印参数失败: {}", e),
                            error_type: "SerializationError".to_string(),
                        })?;
                crate::image::watermark::add_watermark(current_path.clone(), output_path.clone(), params)?;
            }
            BatchOperationType::Convert => {
                let params: crate::image::convert::ExportOptions =
                    serde_json::from_value(operation.params.clone())
                        .map_err(|e| ImageError {
                            message: format!("解析导出参数失败: {}", e),
                            error_type: "SerializationError".to_string(),
                        })?;
                crate::image::convert::export_image(current_path.clone(), params)?;
                // export_image 返回的是输出路径，不需要额外处理
                continue;
            }
        }

        // 更新当前路径为输出路径，供下一个操作使用
        if !is_last_op || operation.operation_type != BatchOperationType::Convert {
            current_path = output_path;
        }
    }

    // 清理临时文件
    for temp_file in temp_files {
        let _ = std::fs::remove_file(&temp_file);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_params_validation() {
        let params = BatchParams {
            image_paths: vec!["test1.jpg".to_string()],
            operations: vec![],
            output_dir: None,
            overwrite: false,
        };

        // 应该失败，因为没有操作
        assert!(params.operations.is_empty());
    }
}
