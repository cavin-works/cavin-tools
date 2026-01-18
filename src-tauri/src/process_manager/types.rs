use serde::{Deserialize, Serialize};

/// 进程信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    /// 进程ID
    pub pid: u32,
    /// 进程名称
    pub name: String,
    /// 进程路径(如果可用)
    pub path: Option<String>,
    /// CPU使用率(百分比,如果可用)
    pub cpu_usage: Option<f32>,
    /// 内存使用(MB,如果可用)
    pub memory_usage: Option<f64>,
    /// 是否为系统进程
    pub is_system: bool,
}

/// 端口占用信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    /// 端口号
    pub port: u16,
    /// 协议类型(TCP/UDP)
    pub protocol: String,
    /// 本地地址
    pub local_address: String,
    /// 远程地址(如果存在)
    pub remote_address: Option<String>,
    /// 进程ID
    pub pid: u32,
    /// 进程名称
    pub process_name: String,
    /// 连接状态
    pub state: String,
}

/// 杀进程操作结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KillResult {
    /// 是否成功
    pub success: bool,
    /// 消息
    pub message: String,
    /// 进程ID
    pub pid: u32,
}
