use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, thiserror::Error)]
pub enum UpdateError {
    #[error(transparent)]
    Updater(#[from] tauri_plugin_updater::Error),
    #[error("检查更新失败")]
    CheckFailed,
    #[error("没有可用的更新")]
    NoUpdateAvailable,
    #[error("无效的更新信息")]
    InvalidUpdateInfo,
}

impl Serialize for UpdateError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum DownloadEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        downloaded: u64,
        total: u64,
        percentage: f64,
    },
    Finished,
    #[serde(rename_all = "camelCase")]
    Error {
        error: String,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    body: String,
    date: String,
    current_version: String,
}

pub type UpdateResult<T> = Result<T, UpdateError>;

pub async fn check_update_impl(app: &AppHandle) -> UpdateResult<Option<UpdateInfo>> {
    let update = app.updater()?.check().await?;
    
    match update {
        Some(update) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                body: update.body.clone().unwrap_or_default(),
                date: update.date.as_ref().map(|d| d.to_string()).unwrap_or_default(),
                current_version: update.current_version.clone(),
            };
            Ok(Some(info))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn check_update(app: AppHandle) -> UpdateResult<Option<UpdateInfo>> {
    check_update_impl(&app).await
}

#[tauri::command]
pub async fn download_and_install_update(
    app: AppHandle,
    window: tauri::Window,
) -> UpdateResult<()> {
    let update = app.updater()?.check().await?
        .ok_or(UpdateError::NoUpdateAvailable)?;
    
    let mut downloaded = 0u64;
    let mut total = 0u64;
    let mut has_started = false;
    
    update.download_and_install(
        |chunk_length, content_length| {
            if !has_started {
                let _ = window.emit(
                    "update-download",
                    DownloadEvent::Started { content_length }
                );
                has_started = true;
            }
            
            if let Some(len) = content_length {
                if total == 0 {
                    total = len;
                }
            }
            
            downloaded += chunk_length as u64;
            let percentage = if total > 0 {
                (downloaded as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            
            let _ = window.emit(
                "update-download",
                DownloadEvent::Progress {
                    downloaded,
                    total,
                    percentage,
                }
            );
        },
        || {
            let _ = window.emit(
                "update-download",
                DownloadEvent::Finished
            );
        },
    ).await?;
    
    Ok(())
}
