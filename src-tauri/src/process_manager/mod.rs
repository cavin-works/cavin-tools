mod types;
mod platform;
mod port;

pub use types::{ProcessInfo, PortInfo, KillResult};

use tauri::{Emitter, Window};

/// 获取所有进程列表
#[tauri::command]
pub async fn get_processes() -> Result<Vec<ProcessInfo>, String> {
    platform::list_processes()
}

/// 按名称搜索进程
#[tauri::command]
pub async fn search_processes(name: String) -> Result<Vec<ProcessInfo>, String> {
    platform::find_processes_by_name(&name)
}

/// 杀死指定进程
#[tauri::command]
pub async fn kill_process_command(pid: u32, window: Window) -> Result<KillResult, String> {
    let result = platform::kill_process(pid)?;

    // 发送进程被杀死的事件
    let _ = window.emit("process-killed", serde_json::json!({
        "pid": pid,
        "success": result.success,
        "message": result.message
    }));

    Ok(result)
}

/// 查询端口占用
#[tauri::command]
pub async fn query_port_command(port: u16) -> Result<Vec<PortInfo>, String> {
    port::query_port(port)
}

/// 杀死占用端口的进程
#[tauri::command]
pub async fn kill_port_command(port: u16, window: Window) -> Result<Vec<String>, String> {
    let results = port::kill_port_process(port)?;

    // 发送端口被释放的事件
    let _ = window.emit("port-released", serde_json::json!({
        "port": port,
        "results": results
    }));

    Ok(results)
}

/// 根据PID查询进程占用的端口
#[tauri::command]
pub async fn query_ports_by_pid_command(pid: u32) -> Result<Vec<PortInfo>, String> {
    port::query_ports_by_pid(pid)
}
