pub mod types;
pub mod detect;
pub mod remove;

pub use types::{WatermarkInfo, RemoveParams, RemoveResult};
pub use detect::{detect_watermark_params, calculate_watermark_params};
pub use remove::{remove_watermark, batch_remove_watermarks};
