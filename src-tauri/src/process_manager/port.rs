use super::types::PortInfo;
use super::platform::kill_process;
use std::process::Command;

/// 根据PID查询进程占用的所有端口
pub fn query_ports_by_pid(pid: u32) -> Result<Vec<PortInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        query_ports_by_pid_windows(pid)
    }

    #[cfg(not(target_os = "windows"))]
    {
        query_ports_by_pid_unix(pid)
    }
}

/// Windows平台根据PID查询端口
#[cfg(target_os = "windows")]
fn query_ports_by_pid_windows(pid: u32) -> Result<Vec<PortInfo>, String> {
    // 使用 CREATE_NO_WINDOW 标志防止 cmd 窗口弹出
    let output = Command::new("cmd")
        .args(["/C", "netstat", "-ano"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW 标志
        .output()
        .map_err(|e| format!("执行 netstat 命令失败: {}", e))?;

    if !output.status.success() {
        return Err("netstat 命令执行失败".to_string());
    }

    let content = String::from_utf8_lossy(&output.stdout);
    let mut ports = Vec::new();

    for line in content.lines() {
        if line.trim().is_empty() || line.starts_with("Active") || line.starts_with("Proto") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let connection_pid = parts[parts.len() - 1].parse::<u32>().unwrap_or(0);
        if connection_pid != pid {
            continue;
        }

        let protocol = parts[0].to_string();
        let local_address = parts[1].to_string();
        let remote_address = if parts.len() > 2 { Some(parts[2].to_string()) } else { None };
        let state = if parts.len() > 3 { parts[3].to_string() } else { "UNKNOWN".to_string() };

        // 从本地地址中提取端口号
        if let Some(port_str) = local_address.split(':').last() {
            if let Ok(port) = port_str.parse::<u16>() {
                let process_name = get_process_name_by_pid(pid);

                ports.push(PortInfo {
                    port,
                    protocol,
                    local_address,
                    remote_address,
                    pid,
                    process_name,
                    state,
                });
            }
        }
    }

    if ports.is_empty() {
        Err(format!("进程 {} 没有占用任何端口", pid))
    } else {
        Ok(ports)
    }
}

/// Unix平台根据PID查询端口
#[cfg(not(target_os = "windows"))]
fn query_ports_by_pid_unix(pid: u32) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("sh")
        .args(["-c", &format!("lsof -Pan -p {} 2>/dev/null", pid)])
        .output();

    match output {
        Ok(output) => {
            if !output.status.success() || output.stdout.is_empty() {
                return Err(format!("进程 {} 没有占用任何端口", pid));
            }

            let content = String::from_utf8_lossy(&output.stdout);
            let mut ports = Vec::new();

            for line in content.lines() {
                if line.trim().is_empty() || line.starts_with("COMMAND") {
                    continue;
                }

                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 10 {
                    continue;
                }

                let process_name = parts[0].to_string();
                let protocol = parts[4].to_string();
                let address = parts[8].to_string();

                // 从地址中提取端口
                if let Some(port_str) = address.split(':').last() {
                    if let Ok(port) = port_str.parse::<u16>() {
                        ports.push(PortInfo {
                            port,
                            protocol,
                            local_address: address,
                            remote_address: None,
                            pid,
                            process_name,
                            state: "LISTENING".to_string(),
                        });
                    }
                }
            }

            if ports.is_empty() {
                Err(format!("进程 {} 没有占用任何端口", pid))
            } else {
                Ok(ports)
            }
        }
        Err(_) => {
            // lsof 不可用，尝试使用其他方法
            Err(format!("无法查询进程 {} 的端口信息 (需要 lsof 工具)", pid))
        }
    }
}

/// 查询指定端口占用情况
pub fn query_port(port: u16) -> Result<Vec<PortInfo>, String> {
    if port < 1 || port > 65535 {
        return Err("端口号必须在 1-65535 之间".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        query_port_windows(port)
    }

    #[cfg(not(target_os = "windows"))]
    {
        query_port_unix(port)
    }
}

/// Windows平台查询端口
#[cfg(target_os = "windows")]
fn query_port_windows(port: u16) -> Result<Vec<PortInfo>, String> {
    // 使用 CREATE_NO_WINDOW 标志防止 cmd 窗口弹出
    let output = Command::new("cmd")
        .args(["/C", "netstat", "-ano"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW 标志
        .output()
        .map_err(|e| format!("执行 netstat 命令失败: {}", e))?;

    if !output.status.success() {
        return Err("netstat 命令执行失败".to_string());
    }

    let content = String::from_utf8_lossy(&output.stdout);
    let mut ports = Vec::new();

    for line in content.lines() {
        if line.trim().is_empty() || line.starts_with("Active") || line.starts_with("Proto") {
            continue;
        }

        // 解析 netstat 输出格式
        // TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    1234
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let protocol = parts[0].to_string();
        let local_address = parts[1].to_string();
        let remote_address = if parts.len() > 2 { Some(parts[2].to_string()) } else { None };
        let state = if parts.len() > 3 { parts[3].to_string() } else { "UNKNOWN".to_string() };
        let pid = parts[parts.len() - 1].parse::<u32>().unwrap_or(0);

        // 检查本地地址是否包含目标端口
        if let Some(port_str) = local_address.split(':').last() {
            if let Ok(local_port) = port_str.parse::<u16>() {
                if local_port == port {
                    // 获取进程名称
                    let process_name = get_process_name_by_pid(pid);

                    ports.push(PortInfo {
                        port: local_port,
                        protocol,
                        local_address,
                        remote_address,
                        pid,
                        process_name,
                        state,
                    });
                }
            }
        }
    }

    if ports.is_empty() {
        Err(format!("端口 {} 未被占用", port))
    } else {
        Ok(ports)
    }
}

/// Unix平台查询端口
#[cfg(not(target_os = "windows"))]
fn query_port_unix(port: u16) -> Result<Vec<PortInfo>, String> {
    // 尝试使用 lsof 命令
    let output = Command::new("sh")
        .args(["-c", &format!("lsof -i :{} -P -n 2>/dev/null || netstat -tuln 2>/dev/null | grep :{}", port, port)])
        .output();

    match output {
        Ok(output) => {
            if !output.status.success() {
                return Err(format!("端口 {} 未被占用", port));
            }

            let content = String::from_utf8_lossy(&output.stdout);
            let mut ports = Vec::new();

            // 解析 lsof 输出
            for line in content.lines() {
                if line.trim().is_empty() || line.starts_with("COMMAND") {
                    continue;
                }

                // lsof 输出格式示例:
                // COMMAND   PID USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
                // node    12345 user   21u  IPv4  123456      0t0  TCP [::1]:3000 (LISTEN)
                // node    12345 user   37u  IPv4  123456      0t0  TCP [::1]:3000->[::1]:58109 (ESTABLISHED)
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 9 {
                    continue;
                }

                let process_name = parts[0].to_string();
                let pid = parts[1].parse::<u32>().unwrap_or(0);

                // 找到协议字段（TCP 或 UDP）的索引
                let protocol_idx = parts.iter()
                    .position(|&p| p == "TCP" || p == "UDP")
                    .unwrap_or(7);

                let protocol = parts.get(protocol_idx).unwrap_or(&"TCP").to_string();

                // 从协议字段之后的所有内容组成完整地址字符串
                // 因为 NAME 字段可能包含空格，如 (ESTABLISHED)
                let address_str = parts[protocol_idx + 1..].join(" ");

                // 从地址字符串中提取本地端口
                // 格式: [::1]:1421 (LISTEN) 或 [::1]:1421->[::1]:49224 (ESTABLISHED)
                let local_port: Option<u16> = extract_local_port(&address_str);

                if let Some(parsed_port) = local_port {
                    if parsed_port == port {
                        let state = if address_str.contains("LISTEN") {
                            "LISTENING".to_string()
                        } else if address_str.contains("ESTABLISHED") {
                            "ESTABLISHED".to_string()
                        } else {
                            "UNKNOWN".to_string()
                        };

                        ports.push(PortInfo {
                            port: parsed_port,
                            protocol,
                            local_address: address_str.clone(),
                            remote_address: None,
                            pid,
                            process_name,
                            state,
                        });
                    }
                }
            }

            if ports.is_empty() {
                Err(format!("端口 {} 未被占用", port))
            } else {
                Ok(ports)
            }
        }
        Err(_) => {
            // 如果 lsof 不可用,尝试使用 netstat
            let output = Command::new("sh")
                .args(["-c", &format!("netstat -tuln 2>/dev/null | grep ':{} '", port)])
                .output()
                .map_err(|e| format!("执行查询命令失败: {}", e))?;

            if !output.status.success() || output.stdout.is_empty() {
                return Err(format!("端口 {} 未被占用", port));
            }

            Err(format!("端口 {} 被占用,但无法获取详细信息", port))
        }
    }
}

/// 杀死占用指定端口的所有进程
pub fn kill_port_process(port: u16) -> Result<Vec<String>, String> {
    let port_infos = query_port(port)?;

    if port_infos.is_empty() {
        return Err(format!("端口 {} 未被占用", port));
    }

    let mut results = Vec::new();
    let mut killed_pids = std::collections::HashSet::new();

    for port_info in &port_infos {
        if !killed_pids.contains(&port_info.pid) {
            match kill_process(port_info.pid) {
                Ok(result) => {
                    if result.success {
                        results.push(format!(
                            "已终止进程 {} (PID: {}), 释放端口 {}",
                            port_info.process_name, port_info.pid, port
                        ));
                    } else {
                        results.push(format!(
                            "终止进程 {} (PID: {}) 失败: {}",
                            port_info.process_name, port_info.pid, result.message
                        ));
                    }
                    killed_pids.insert(port_info.pid);
                }
                Err(e) => {
                    results.push(format!(
                        "终止进程 {} (PID: {}) 时出错: {}",
                        port_info.process_name, port_info.pid, e
                    ));
                }
            }
        }
    }

    if results.iter().all(|r| r.contains("失败") || r.contains("出错")) {
        Err("未能成功终止任何进程".to_string())
    } else {
        Ok(results)
    }
}

/// 从地址字符串中提取本地端口
/// 格式: [::1]:1421 (LISTEN) 或 [::1]:1421->[::1]:49224 (ESTABLISHED)
fn extract_local_port(address_str: &str) -> Option<u16> {
    if let Some(bracket_start) = address_str.find('[') {
        let addr_part = &address_str[bracket_start..];

        let addr_end = if let Some(space_pos) = addr_part.find(' ') {
            space_pos
        } else if let Some(paren_pos) = addr_part.find('(') {
            paren_pos
        } else {
            addr_part.len()
        };

        let addr = &addr_part[..addr_end];

        if addr.contains("->") {
            addr.split("->").next()?.split(':').last()?.parse::<u16>().ok()
        } else {
            addr.split(':').last()?.parse::<u16>().ok()
        }
    } else {
        None
    }
}

/// 根据PID获取进程名称
fn get_process_name_by_pid(pid: u32) -> String {
    #[cfg(target_os = "windows")]
    {
        get_process_name_by_pid_windows(pid)
    }

    #[cfg(not(target_os = "windows"))]
    {
        get_process_name_by_pid_unix(pid)
    }
}

/// Windows平台获取进程名称
#[cfg(target_os = "windows")]
fn get_process_name_by_pid_windows(pid: u32) -> String {
    // 使用 CREATE_NO_WINDOW 标志防止 cmd 窗口弹出
    let output = Command::new("cmd")
        .args(["/C", "tasklist", "/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW 标志
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let content = String::from_utf8_lossy(&output.stdout);
                for line in content.lines() {
                    if let Some(name) = line.split(',').next() {
                        return name.trim_matches('"').to_string();
                    }
                }
            }
            format!("PID_{}", pid)
        }
        Err(_) => format!("PID_{}", pid),
    }
}

/// Unix平台获取进程名称
#[cfg(not(target_os = "windows"))]
fn get_process_name_by_pid_unix(pid: u32) -> String {
    let output = Command::new("sh")
        .args(["-c", &format!("ps -p {} -o comm= 2>/dev/null", pid)])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !name.is_empty() {
                    return name;
                }
            }
            format!("PID_{}", pid)
        }
        Err(_) => format!("PID_{}", pid),
    }
}
