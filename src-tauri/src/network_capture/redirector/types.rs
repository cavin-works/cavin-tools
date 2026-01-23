use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedirectorConfig {
    pub proxy_port: u16,
    pub listen_addr: String,
}

impl Default for RedirectorConfig {
    fn default() -> Self {
        Self {
            proxy_port: 9527,
            listen_addr: "127.0.0.1".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RedirectorStatus {
    Stopped,
    Starting,
    Running,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub pid: u32,
    pub process_name: String,
    pub src_addr: SocketAddr,
    pub dst_addr: SocketAddr,
    pub original_dst: SocketAddr,
    pub protocol: Protocol,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum Protocol {
    Tcp,
    Udp,
}
