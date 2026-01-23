use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WinDivertInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub path: PathBuf,
}

const WINDIVERT_VERSION: &str = "2.2.2";
const WINDIVERT_X64_URL: &str = "https://github.com/basil00/Divert/releases/download/v2.2.2/WinDivert64.sys";
const WINDIVERT_X86_URL: &str = "https://github.com/basil00/Divert/releases/download/v2.2.2/WinDivert32.sys";
const WINDIVERT_DLL_URL: &str = "https://github.com/basil00/Divert/releases/download/v2.2.2/WinDivert.dll";

pub async fn check_windivert(app_data_dir: &PathBuf) -> WinDivertInfo {
    let driver_dir = app_data_dir.join("windivert");
    let x64_path = driver_dir.join("WinDivert64.sys");
    
    let installed = x64_path.exists();
    WinDivertInfo {
        installed,
        version: if installed { Some(WINDIVERT_VERSION.to_string()) } else { None },
        path: driver_dir,
    }
}

pub async fn download_windivert(
    app_data_dir: &PathBuf,
    progress_callback: Box<dyn Fn(u64, u64) + Send>,
) -> Result<(), String> {
    let driver_dir = app_data_dir.join("windivert");
    
    fs::create_dir_all(&driver_dir)
        .map_err(|e| format!("Failed to create windivert directory: {}", e))?;
    
    let target_files = vec![
        ("WinDivert64.sys", WINDIVERT_X64_URL),
        ("WinDivert32.sys", WINDIVERT_X86_URL),
        ("WinDivert.dll", WINDIVERT_DLL_URL),
    ];
    
    for (filename, url) in target_files {
        let file_path = driver_dir.join(filename);
        
        progress_callback(0, 100);
        
        let response = reqwest::get(url)
            .await
            .map_err(|e| format!("Failed to download {}: {}", filename, e))?;
        
        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded = 0u64;
        
        let mut dest_file = fs::File::create(&file_path)
            .map_err(|e| format!("Failed to create file {}: {}", filename, e))?;
        
        let mut stream = response.bytes_stream();
        
        while let Some(chunk) = stream.next().await {
            let chunk = chunk
                .map_err(|e| format!("Failed to read chunk: {}", e))?;
            
            dest_file.write_all(&chunk)
                .map_err(|e| format!("Failed to write to file: {}", e))?;
            
            downloaded += chunk.len() as u64;
            if total_size > 0 {
                let percent = (downloaded * 100 / total_size).min(100);
                progress_callback(percent, 100);
            }
        }
        
        progress_callback(100, 100);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_windivert_info(
    app: tauri::AppHandle,
) -> Result<WinDivertInfo, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    Ok(check_windivert(&app_data_dir).await)
}

#[tauri::command]
pub async fn download_windivert_command(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<WinDivertInfo, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let progress_tx = window.clone();
    
    download_windivert(&app_data_dir, Box::new(move |current, total| {
        let _ = progress_tx.emit("windivert-download-progress", serde_json::json!({
            "current": current,
            "total": total,
            "percentage": (current * 100 / total).min(100)
        }));
    })).await?;
    
    Ok(check_windivert(&app_data_dir).await)
}
