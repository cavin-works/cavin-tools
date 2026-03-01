//! Sticky Notes module
//!
//! Provides quick note-taking functionality with desktop embedding support.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use tauri_plugin_store::StoreExt;

// Windows-specific imports for desktop embedding
#[cfg(target_os = "windows")]
use windows::{
    core::PCWSTR,
    Win32::{
        Foundation::HWND,
        UI::WindowsAndMessaging::{
            FindWindowW, FindWindowExW, SendMessageTimeoutW, SetParent,
            HWND_TOPMOST, SMTO_NORMAL, SWP_NOACTIVATE, SWP_NOMOVE,
            SWP_NOSIZE, SWP_SHOWWINDOW, WM_USER, SetWindowPos,
        },
    },
};

// ============================================================
// Data Structures (matching frontend types.ts)
// ============================================================

/// Todo task status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TodoStatus {
    Pending,
    Completed,
}

/// Todo task priority
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TodoPriority {
    Low,
    Medium,
    High,
}

/// Todo task entity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoTask {
    pub id: String,
    pub title: String,
    pub status: TodoStatus,
    pub priority: TodoPriority,
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

/// Widget position
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

/// Widget theme type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WidgetTheme {
    Dark,
    Light,
    Blue,
    Purple,
    Green,
    Orange,
    Custom,
}

/// Theme colors for custom theme
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThemeColors {
    pub background: String,
    pub text: String,
    pub text_secondary: String,
    pub border: String,
    pub accent: String,
}

/// Widget configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoWidgetConfig {
    pub position: WidgetPosition,
    pub width: u32,
    pub height: u32,
    pub opacity: f32,
    pub is_desktop_mode: bool,
    pub is_pinned: bool,
    pub theme: WidgetTheme,
    pub custom_colors: Option<ThemeColors>,
}

/// Hotkey configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyConfig {
    pub toggle: String,
    pub toggle_pin: String,
    pub quick_add: String,
}

/// Global Todo configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoConfig {
    pub widget: TodoWidgetConfig,
    pub hotkeys: HotkeyConfig,
}

/// Todo store data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoStoreData {
    pub tasks: Vec<TodoTask>,
    pub config: TodoConfig,
    pub version: u32,
}

// Legacy types for backward compatibility
/// Note window state (legacy)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteWindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_detached: bool,
    pub is_pinned: bool,
    pub is_desktop_mode: bool,
    pub opacity: f32,
}

/// Window manager for detached notes
pub struct NoteWindowManager {
    windows: Mutex<HashMap<String, String>>, // note_id -> window_label
}

impl NoteWindowManager {
    pub fn new() -> Self {
        Self {
            windows: Mutex::new(HashMap::new()),
        }
    }

    pub fn register(&self, note_id: String, window_label: String) {
        if let Ok(mut windows) = self.windows.lock() {
            windows.insert(note_id, window_label);
        }
    }

    pub fn unregister(&self, note_id: &str) {
        if let Ok(mut windows) = self.windows.lock() {
            windows.remove(note_id);
        }
    }

    pub fn get_window_label(&self, note_id: &str) -> Option<String> {
        if let Ok(windows) = self.windows.lock() {
            windows.get(note_id).cloned()
        } else {
            None
        }
    }

    pub fn get_all_window_labels(&self) -> Vec<String> {
        if let Ok(windows) = self.windows.lock() {
            windows.values().cloned().collect()
        } else {
            vec![]
        }
    }
}

impl Default for NoteWindowManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================
// Windows Desktop Embedding
// ============================================================

/// Embed a window into the Windows desktop wallpaper layer
/// This makes the window visible when user presses Win+D (Show Desktop)
#[cfg(target_os = "windows")]
pub fn embed_window_into_desktop(hwnd: isize) -> Result<(), String> {
    unsafe {
        let hwnd = HWND(hwnd as *mut std::ffi::c_void);

        // Step 1: Find the Program Manager window
        let progman_class: Vec<u16> = "Progman\0".encode_utf16().collect();
        let progman = FindWindowW(PCWSTR(progman_class.as_ptr()), PCWSTR(std::ptr::null()))
            .map_err(|e| format!("Failed to find Progman window: {}", e))?;

        if progman.0.is_null() {
            return Err("Progman window is null".to_string());
        }

        // Step 2: Send message to create WorkerW window (this is how Windows handles wallpaper)
        // 0x052C is a special message that tells Explorer to create the WorkerW window
        let _result = SendMessageTimeoutW(
            progman,
            WM_USER + 0x02C, // 0x052C
            windows::Win32::Foundation::WPARAM(0x0D),
            windows::Win32::Foundation::LPARAM(0),
            SMTO_NORMAL,
            1000,
            None,
        );

        // Step 3: Find the WorkerW window that contains SHELLDLL_DefView
        // We need to iterate through WorkerW windows to find the right one
        let mut workerw: HWND = HWND(std::ptr::null_mut());

        let workerw_class: Vec<u16> = "WorkerW\0".encode_utf16().collect();
        let defview_class: Vec<u16> = "SHELLDLL_DefView\0".encode_utf16().collect();

        // Try iterating through WorkerW windows
        let mut temp_workerw = HWND(std::ptr::null_mut());

        loop {
            temp_workerw = FindWindowExW(
                HWND(std::ptr::null_mut()),
                temp_workerw,
                PCWSTR(workerw_class.as_ptr()),
                PCWSTR(std::ptr::null()),
            ).unwrap_or(HWND(std::ptr::null_mut()));

            if temp_workerw.0.is_null() {
                break;
            }

            // Check if this WorkerW has SHELLDLL_DefView as child
            let defview = FindWindowExW(
                temp_workerw,
                HWND(std::ptr::null_mut()),
                PCWSTR(defview_class.as_ptr()),
                PCWSTR(std::ptr::null()),
            ).unwrap_or(HWND(std::ptr::null_mut()));

            if !defview.0.is_null() {
                // This is the WorkerW we want (the one that has icons)
                // We want the NEXT WorkerW, which will be the one for wallpaper
                let wallpaper_workerw = FindWindowExW(
                    HWND(std::ptr::null_mut()),
                    temp_workerw,
                    PCWSTR(workerw_class.as_ptr()),
                    PCWSTR(std::ptr::null()),
                ).unwrap_or(HWND(std::ptr::null_mut()));

                if !wallpaper_workerw.0.is_null() {
                    workerw = wallpaper_workerw;
                } else {
                    // Fallback: use Progman as parent
                    workerw = progman;
                }
                break;
            }
        }

        // Fallback to Progman if we couldn't find WorkerW
        if workerw.0.is_null() {
            log::warn!("Could not find WorkerW, using Progman as fallback");
            workerw = progman;
        }

        // Step 4: Set our window as child of the desktop window
        let result = SetParent(hwnd, workerw)
            .map_err(|e| format!("SetParent failed: {}", e))?;
        if result.0.is_null() {
            return Err(format!("SetParent returned null: {:?}", std::io::Error::last_os_error()));
        }

        // Step 5: Set window position and style
        let _ = SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE,
        );

        log::info!("Successfully embedded window into desktop");
        Ok(())
    }
}

/// Remove window from desktop embedding (restore to normal window)
#[cfg(target_os = "windows")]
pub fn unembed_window_from_desktop(_hwnd: isize) -> Result<(), String> {
    // Note: SetParent(NULL) doesn't work well in all cases
    // For proper restoration, we might need to recreate the window
    // For now, we'll just log and let the window be closed/recreated

    log::info!("Unembedding window from desktop");
    Ok(())
}

/// Non-Windows stub
#[cfg(not(target_os = "windows"))]
pub fn embed_window_into_desktop(_hwnd: isize) -> Result<(), String> {
    log::warn!("Desktop embedding is only supported on Windows");
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub fn unembed_window_from_desktop(_hwnd: isize) -> Result<(), String> {
    Ok(())
}

// ============================================================
// Tauri Commands
// ============================================================

/// Default configuration
fn get_default_config() -> TodoConfig {
    TodoConfig {
        widget: TodoWidgetConfig {
            position: WidgetPosition { x: 100, y: 100 },
            width: 320,
            height: 400,
            opacity: 0.9,
            is_desktop_mode: true,
            is_pinned: false,
            theme: WidgetTheme::Dark,
            custom_colors: None,
        },
        hotkeys: HotkeyConfig {
            toggle: "CommandOrControl+Alt+T".to_string(),
            toggle_pin: "CommandOrControl+Alt+P".to_string(),
            quick_add: "CommandOrControl+Alt+N".to_string(),
        },
    }
}

/// Load sticky notes from store
#[tauri::command]
pub async fn load_sticky_notes(app: AppHandle) -> Result<Option<TodoStoreData>, String> {
    let store = app
        .store("sticky-notes")
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let tasks = store
        .get("tasks")
        .and_then(|v| serde_json::from_value::<Vec<TodoTask>>(v.clone()).ok())
        .unwrap_or_default();

    let config = store
        .get("config")
        .and_then(|v| serde_json::from_value::<TodoConfig>(v.clone()).ok())
        .unwrap_or_else(get_default_config);

    let version = store
        .get("version")
        .and_then(|v| v.as_u64())
        .unwrap_or(1) as u32;

    Ok(Some(TodoStoreData {
        tasks,
        config,
        version,
    }))
}

/// Save sticky notes to store
#[tauri::command]
pub async fn save_sticky_notes(app: AppHandle, data: TodoStoreData) -> Result<(), String> {
    let store = app
        .store("sticky-notes")
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set("tasks", serde_json::to_value(&data.tasks).unwrap());
    store.set("config", serde_json::to_value(&data.config).unwrap());
    store.set("version", serde_json::to_value(&data.version).unwrap());

    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Detach a note as an independent window
#[tauri::command]
pub async fn detach_note_window(
    app: AppHandle,
    note_id: String,
    window_state: NoteWindowState,
) -> Result<(), String> {
    let label = format!("note-{}", note_id);

    // Check if window already exists
    if app.get_webview_window(&label).is_some() {
        // If window exists, just show and focus it
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.show();
            let _ = window.set_focus();
        }
        return Ok(());
    }

    // Determine URL based on note_id
    let url = if note_id == "todo-widget" {
        WebviewUrl::App("/todo-widget".into())
    } else {
        WebviewUrl::App(format!("/note/{}", note_id).into())
    };

    let title = if note_id == "todo-widget" {
        "Todo List"
    } else {
        "便签"
    };

    let window = WebviewWindowBuilder::new(&app, &label, url)
        .title(title)
        .inner_size(window_state.width as f64, window_state.height as f64)
        .position(window_state.x as f64, window_state.y as f64)
        .decorations(false)
        .transparent(true)
        .always_on_top(window_state.is_pinned)
        .skip_taskbar(window_state.is_desktop_mode)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    // Embed window into desktop if desktop mode is enabled
    if window_state.is_desktop_mode {
        // Get the native window handle
        #[cfg(target_os = "windows")]
        {
            // Get HWND from the window
            if let Ok(hwnd) = window.hwnd() {
                if let Err(e) = embed_window_into_desktop(hwnd.0 as isize) {
                    log::error!("Failed to embed window into desktop: {}", e);
                    // Continue anyway - window will still be visible
                }
            }
        }
    }

    // Register window in manager
    if let Some(manager) = app.try_state::<NoteWindowManager>() {
        manager.register(note_id.clone(), label);
    }

    Ok(())
}

/// Attach a note back to main window (close independent window)
#[tauri::command]
pub async fn attach_note_window(app: AppHandle, note_id: String) -> Result<(), String> {
    let label = format!("note-{}", note_id);

    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    }

    // Unregister window from manager
    if let Some(manager) = app.try_state::<NoteWindowManager>() {
        manager.unregister(&note_id);
    }

    Ok(())
}

/// Update note window state
#[tauri::command]
pub async fn update_note_window_state(
    app: AppHandle,
    note_id: String,
    state: NoteWindowState,
) -> Result<(), String> {
    let label = format!("note-{}", note_id);

    if let Some(window) = app.get_webview_window(&label) {
        window
            .set_always_on_top(state.is_pinned)
            .map_err(|e| format!("Failed to set always on top: {}", e))?;

        window
            .set_skip_taskbar(state.is_desktop_mode)
            .map_err(|e| format!("Failed to set skip taskbar: {}", e))?;

        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: state.width,
                height: state.height,
            }))
            .map_err(|e| format!("Failed to set size: {}", e))?;

        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: state.x,
                y: state.y,
            }))
            .map_err(|e| format!("Failed to set position: {}", e))?;
    }

    Ok(())
}

/// Toggle desktop embedding mode for a note window
#[tauri::command]
pub async fn set_desktop_mode(
    app: AppHandle,
    note_id: String,
    desktop_mode: bool,
) -> Result<(), String> {
    let label = format!("note-{}", note_id);

    if let Some(window) = app.get_webview_window(&label) {
        window
            .set_skip_taskbar(desktop_mode)
            .map_err(|e| format!("Failed to set skip taskbar: {}", e))?;

        // Embed or unembed from desktop
        #[cfg(target_os = "windows")]
        {
            if let Ok(hwnd) = window.hwnd() {
                if desktop_mode {
                    if let Err(e) = embed_window_into_desktop(hwnd.0 as isize) {
                        log::error!("Failed to embed window into desktop: {}", e);
                    }
                } else {
                    if let Err(e) = unembed_window_from_desktop(hwnd.0 as isize) {
                        log::error!("Failed to unembed window from desktop: {}", e);
                    }
                }
            }
        }
    }

    Ok(())
}

/// Start window dragging (for embedded windows that can't use JS dragging)
#[tauri::command]
pub async fn start_window_dragging(app: AppHandle, note_id: String) -> Result<(), String> {
    let label = format!("note-{}", note_id);

    if let Some(window) = app.get_webview_window(&label) {
        window
            .start_dragging()
            .map_err(|e| format!("Failed to start dragging: {}", e))?;
    }

    Ok(())
}

/// Toggle pin all detached notes
#[tauri::command]
pub async fn toggle_pin_all_notes(app: AppHandle, pinned: bool) -> Result<(), String> {
    if let Some(manager) = app.try_state::<NoteWindowManager>() {
        let labels = manager.get_all_window_labels();
        for label in labels {
            if let Some(window) = app.get_webview_window(&label) {
                let _ = window.set_always_on_top(pinned);
            }
        }
    }

    Ok(())
}

/// Show/hide all detached notes
#[tauri::command]
pub async fn show_hide_all_notes(app: AppHandle, visible: bool) -> Result<(), String> {
    if let Some(manager) = app.try_state::<NoteWindowManager>() {
        let labels = manager.get_all_window_labels();
        for label in labels {
            if let Some(window) = app.get_webview_window(&label) {
                if visible {
                    let _ = window.show();
                } else {
                    let _ = window.hide();
                }
            }
        }
    }

    Ok(())
}

/// Register global shortcuts for sticky notes
pub fn register_global_shortcuts(app: &AppHandle) -> Result<(), String> {
    // Quick create note: Ctrl/Cmd + Alt + N
    let quick_create_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyN);

    app.global_shortcut()
        .on_shortcut(quick_create_shortcut, |app, _shortcut, _event| {
            log::info!("Quick create note shortcut triggered");
            if let Err(e) = app.emit("quick-create-note", ()) {
                log::error!("Failed to emit quick-create-note event: {}", e);
            }
        })
        .map_err(|e| format!("Failed to register quick create shortcut: {}", e))?;

    // Toggle pin all notes: Ctrl/Cmd + Alt + P
    let toggle_pin_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyP);

    app.global_shortcut()
        .on_shortcut(toggle_pin_shortcut, |app, _shortcut, _event| {
            log::info!("Toggle pin all notes shortcut triggered");
            // Toggle state - we'll let the frontend handle the toggle logic
            if let Err(e) = app.emit("toggle-pin-all-notes-shortcut", ()) {
                log::error!("Failed to emit toggle-pin-all-notes event: {}", e);
            }
        })
        .map_err(|e| format!("Failed to register toggle pin shortcut: {}", e))?;

    // Show/hide all notes: Ctrl/Cmd + Alt + H
    let show_hide_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyH);

    app.global_shortcut()
        .on_shortcut(show_hide_shortcut, |app, _shortcut, _event| {
            log::info!("Show/hide all notes shortcut triggered");
            if let Err(e) = app.emit("show-hide-all-notes-shortcut", ()) {
                log::error!("Failed to emit show-hide-all-notes event: {}", e);
            }
        })
        .map_err(|e| format!("Failed to register show/hide shortcut: {}", e))?;

    log::info!("Sticky notes global shortcuts registered successfully");
    Ok(())
}
