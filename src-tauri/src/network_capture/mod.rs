use std::sync::Arc;
use tauri::{command, AppHandle, Emitter, State};
use tokio::sync::{mpsc, RwLock};

pub mod certificate;
pub mod proxy;
pub mod store;
pub mod types;
pub mod process_list;
pub mod redirector;
pub mod windivert_download;

use certificate::ca::CaManager;
use proxy::server::ProxyServer;
use store::request_store::RequestStore;
use types::{CaInfo, CapturedRequest, FilterCriteria, ProxyStatus};
use windivert_download::WinDivertInfo;

pub struct NetworkCaptureState {
    pub proxy: RwLock<Option<Arc<ProxyServer>>>,
    pub store: Arc<RequestStore>,
    pub ca_manager: Arc<RwLock<Option<CaManager>>>,
    pub app_data_dir: std::path::PathBuf,
}

impl NetworkCaptureState {
    pub fn new(app_data_dir: std::path::PathBuf) -> Self {
        Self {
            proxy: RwLock::new(None),
            store: Arc::new(RequestStore::new(5000)),
            ca_manager: Arc::new(RwLock::new(None)),
            app_data_dir,
        }
    }

    pub async fn ensure_ca_manager(&self) -> Result<(), String> {
        let mut guard = self.ca_manager.write().await;
        if guard.is_none() {
            let manager = CaManager::new(self.app_data_dir.clone())?;
            *guard = Some(manager);
        }
        Ok(())
    }
}

#[command]
pub async fn init_network_capture(
    _app: AppHandle,
    state: State<'_, NetworkCaptureState>,
) -> Result<CaInfo, String> {
    state.ensure_ca_manager().await?;
    let guard = state.ca_manager.read().await;
    let manager = guard.as_ref().ok_or("CA manager not initialized")?;
    
    Ok(CaInfo {
        exists: true,
        path: manager.get_ca_cert_path().to_string_lossy().to_string(),
        pem: Some(manager.get_ca_cert_pem()),
    })
}

#[command]
pub async fn start_network_capture(
    app: AppHandle,
    state: State<'_, NetworkCaptureState>,
    port: Option<u16>,
) -> Result<ProxyStatus, String> {
    state.ensure_ca_manager().await?;
    
    let port = port.unwrap_or(9527);
    let (tx, mut rx) = mpsc::channel::<CapturedRequest>(1000);

    let ca_guard = state.ca_manager.read().await;
    let ca_manager = ca_guard.as_ref().ok_or("CA manager not initialized")?;
    
    let proxy = Arc::new(ProxyServer::new(port, ca_manager.clone_arc(), tx));
    proxy.start().await?;
    
    *state.proxy.write().await = Some(proxy);

    let app_clone = app.clone();
    let store = state.store.clone();
    tokio::spawn(async move {
        while let Some(request) = rx.recv().await {
            store.add(request.clone()).await;
            let _ = app_clone.emit("captured-request", &request);
        }
    });

    Ok(ProxyStatus {
        running: true,
        port,
        request_count: 0,
        ca_installed: false,
    })
}

#[command]
pub async fn stop_network_capture(
    state: State<'_, NetworkCaptureState>,
) -> Result<(), String> {
    if let Some(proxy) = state.proxy.write().await.take() {
        proxy.stop().await;
    }
    Ok(())
}

#[command]
pub async fn get_captured_requests(
    state: State<'_, NetworkCaptureState>,
    filter: Option<FilterCriteria>,
) -> Result<Vec<CapturedRequest>, String> {
    Ok(state.store.get_filtered(filter).await)
}

#[command]
pub async fn clear_captured_requests(
    state: State<'_, NetworkCaptureState>,
) -> Result<(), String> {
    state.store.clear().await;
    Ok(())
}

#[command]
pub async fn get_ca_cert_path(
    state: State<'_, NetworkCaptureState>,
) -> Result<String, String> {
    state.ensure_ca_manager().await?;
    let guard = state.ca_manager.read().await;
    let manager = guard.as_ref().ok_or("CA manager not initialized")?;
    Ok(manager.get_ca_cert_path().to_string_lossy().to_string())
}

#[command]
pub async fn get_ca_cert_pem(
    state: State<'_, NetworkCaptureState>,
) -> Result<String, String> {
    state.ensure_ca_manager().await?;
    let guard = state.ca_manager.read().await;
    let manager = guard.as_ref().ok_or("CA manager not initialized")?;
    Ok(manager.get_ca_cert_pem())
}

#[command]
pub fn get_ca_install_instructions() -> String {
    certificate::installer::get_install_instructions()
}

#[command]
pub async fn get_proxy_status(
    state: State<'_, NetworkCaptureState>,
) -> Result<ProxyStatus, String> {
    let proxy_guard = state.proxy.read().await;
    let running = proxy_guard.is_some();
    let port = proxy_guard.as_ref().map(|p| p.port()).unwrap_or(9527);
    let request_count = state.store.len().await;

    Ok(ProxyStatus {
        running,
        port,
        request_count,
        ca_installed: false,
    })
}

#[command]
pub fn get_running_applications() -> Vec<process_list::ApplicationInfo> {
    process_list::get_applications()
}

#[command]
pub fn search_applications(query: String) -> Vec<process_list::ApplicationInfo> {
    process_list::search_applications(&query)
}

#[command]
pub fn get_all_running_processes() -> Vec<process_list::ProcessInfo> {
    process_list::get_all_processes()
}

#[command]
pub async fn get_windivert_info(
    app: tauri::AppHandle,
) -> Result<WinDivertInfo, String> {
    windivert_download::get_windivert_info(app).await
}

#[command]
pub async fn download_windivert_command(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<WinDivertInfo, String> {
    windivert_download::download_windivert_command(app, window).await
}
