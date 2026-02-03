use super::types::{ProcessInfo, KillResult};
use std::process::Command;

/// 获取所有进程列表
pub fn list_processes() -> Result<Vec<ProcessInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        list_processes_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        list_processes_unix()
    }
}

/// Windows平台获取进程列表
#[cfg(target_os = "windows")]
fn list_processes_windows() -> Result<Vec<ProcessInfo>, String> {
    use std::os::windows::process::CommandExt;

    // 使用 CREATE_NO_WINDOW 标志防止 cmd 窗口弹出
    let output = Command::new("cmd")
        .args(["/C", "tasklist", "/fo", "csv", "/nh"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW 标志
        .output()
        .map_err(|e| format!("执行 tasklist 命令失败: {}", e))?;

    if !output.status.success() {
        return Err("tasklist 命令执行失败".to_string());
    }

    let content = String::from_utf8_lossy(&output.stdout);
    let mut processes = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // 解析CSV格式: "映像名称","PID","会话名","会话#","内存使用"
        // 使用简单的 CSV 解析，处理带引号的字段
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 5 {
            continue;
        }

        // 清理并提取名称（去掉引号）
        let name = parts.get(0)
            .map(|s| s.trim().trim_matches('"'))
            .unwrap_or("")
            .to_string();

        // 清理并提取 PID（去掉引号）
        let pid = parts.get(1)
            .and_then(|s| s.trim().trim_matches('"').parse::<u32>().ok())
            .unwrap_or(0);

        if pid == 0 {
            continue; // 跳过无效 PID
        }

        // 清理并提取内存使用（去掉引号和 " K" 后缀）
        let memory_str = parts.get(4)
            .map(|s| s.trim().trim_matches('"'))
            .and_then(|s| s.strip_suffix(" K"))
            .and_then(|s| s.replace(",", "").parse::<f64>().ok())
            .unwrap_or(0.0);

        let memory_usage = Some(memory_str / 1024.0); // 转换为MB

        // 判断是否为系统进程
        let is_system = is_system_process(&name);

        processes.push(ProcessInfo {
            pid,
            name,
            path: None,
            cpu_usage: None, // tasklist不提供CPU使用率
            memory_usage,
            is_system,
        });
    }

    Ok(processes)
}

/// Unix平台获取进程列表
#[cfg(not(target_os = "windows"))]
fn list_processes_unix() -> Result<Vec<ProcessInfo>, String> {
    // 使用兼容 Mac 和 Linux 的 ps 命令格式
    let output = Command::new("sh")
        .args(["-c", "ps -e -o pid,comm,rss"])
        .output()
        .map_err(|e| format!("执行 ps 命令失败: {}", e))?;

    if !output.status.success() {
        return Err("ps 命令执行失败".to_string());
    }

    let content = String::from_utf8_lossy(&output.stdout);
    let mut processes = Vec::new();

    for (index, line) in content.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }

        // 跳过第一行 header
        if index == 0 {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let pid = parts[0].parse::<u32>().unwrap_or(0);
        let name = parts[1].to_string();
        let memory_kb = parts[2].parse::<f64>().unwrap_or(0.0);
        let memory_usage = Some(memory_kb / 1024.0); // 转换为MB

        let is_system = is_system_process(&name);

        processes.push(ProcessInfo {
            pid,
            name,
            path: None,
            cpu_usage: None,
            memory_usage,
            is_system,
        });
    }

    Ok(processes)
}

/// 按名称搜索进程
pub fn find_processes_by_name(name: &str) -> Result<Vec<ProcessInfo>, String> {
    let all_processes = list_processes()?;
    let name_lower = name.to_lowercase();

    let filtered: Vec<ProcessInfo> = all_processes
        .into_iter()
        .filter(|p| p.name.to_lowercase().contains(&name_lower))
        .collect();

    Ok(filtered)
}

/// 杀死指定进程
pub fn kill_process(pid: u32) -> Result<KillResult, String> {
    #[cfg(target_os = "windows")]
    {
        kill_process_windows(pid)
    }

    #[cfg(not(target_os = "windows"))]
    {
        kill_process_unix(pid)
    }
}

/// Windows平台杀进程
#[cfg(target_os = "windows")]
fn kill_process_windows(pid: u32) -> Result<KillResult, String> {
    use std::os::windows::process::CommandExt;

    // 使用 CREATE_NO_WINDOW 标志防止窗口弹出
    let output = Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW 标志
        .output()
        .map_err(|e| format!("执行 taskkill 命令失败: {}", e))?;

    let success = output.status.success();
    let message = if success {
        String::from_utf8_lossy(&output.stdout).to_string()
    } else {
        String::from_utf8_lossy(&output.stderr).to_string()
    };

    Ok(KillResult {
        success,
        message: if success {
            format!("进程 {} 已终止", pid)
        } else {
            format!("终止进程 {} 失败: {}", pid, message)
        },
        pid,
    })
}

/// Unix平台杀进程
#[cfg(not(target_os = "windows"))]
fn kill_process_unix(pid: u32) -> Result<KillResult, String> {
    let output = Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output()
        .map_err(|e| format!("执行 kill 命令失败: {}", e))?;

    let success = output.status.success();

    Ok(KillResult {
        success,
        message: if success {
            format!("进程 {} 已终止", pid)
        } else {
            format!("终止进程 {} 失败", pid)
        },
        pid,
    })
}

/// 判断是否为系统进程
fn is_system_process(name: &str) -> bool {
    let system_processes = [
        "system", "system idle process", "registry",
        "smss.exe", "csrss.exe", "wininit.exe", "services.exe",
        "lsass.exe", "svchost.exe", "explorer.exe",
        "systemd", "kthreadd", "ksoftirqd", "migration",
        "rcu_", "init", "kthreadd",
    ];

    let name_lower = name.to_lowercase();
    system_processes.iter().any(|&s| {
        name_lower == s.to_lowercase() ||
        name_lower.starts_with("svchost") ||
        name_lower.starts_with("rcu_")
    })
}
