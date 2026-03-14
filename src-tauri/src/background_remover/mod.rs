#[cfg(feature = "background-remover")]
pub mod types;
#[cfg(feature = "background-remover")]
pub mod model;
#[cfg(feature = "background-remover")]
pub mod remove;

#[cfg(feature = "background-remover")]
pub use types::{
    ModelInfo, DownloadProgress, DownloadStatus,
    RemoveBackgroundParams, RemoveBackgroundResult,
    Dimensions
};
#[cfg(feature = "background-remover")]
pub use model::{check_model_status, download_model, get_model_path, delete_model};
#[cfg(feature = "background-remover")]
pub use remove::{remove_background, batch_remove_backgrounds};
