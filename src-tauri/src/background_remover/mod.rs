pub mod types;
pub mod model;
pub mod remove;

pub use types::{
    ModelInfo, DownloadProgress, DownloadStatus,
    RemoveBackgroundParams, RemoveBackgroundResult,
    Dimensions
};
pub use model::{check_model_status, download_model, get_model_path, delete_model};
pub use remove::{remove_background, batch_remove_backgrounds};
