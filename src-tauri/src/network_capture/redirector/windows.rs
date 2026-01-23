use super::types::{ConnectionInfo, Protocol, RedirectorStatus};
use super::Redirector;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;
use tokio::sync::mpsc;
use parking_lot::RwLock;

use windivert::prelude::*;
use etherparse::{SlicedPacket, TransportSlice};

struct ConnectionTracker {
    original_dst: HashMap<(SocketAddr, SocketAddr), SocketAddr>,
}

impl ConnectionTracker {
    fn new() -> Self {
        Self {
            original_dst: HashMap::new(),
        }
    }

    fn track(&mut self, src: SocketAddr, proxy_dst: SocketAddr, original_dst: SocketAddr) {
        self.original_dst.insert((src, proxy_dst), original_dst);
    }

    fn get_original(&self, src: &SocketAddr, proxy_dst: &SocketAddr) -> Option<SocketAddr> {
        self.original_dst.get(&(*src, *proxy_dst)).copied()
    }
}

pub async fn start_redirector(
    redirector: &mut Redirector,
) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
    let (conn_tx, conn_rx) = mpsc::channel::<ConnectionInfo>(1000);
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    redirector.connection_tx = Some(conn_tx.clone());
    redirector.shutdown_tx = Some(shutdown_tx);

    let proxy_port = redirector.config.proxy_port;
    let target_pids = redirector.target_pids.clone();
    let status = redirector.status.clone();

    *status.write() = RedirectorStatus::Starting;

    let filter = format!(
        "tcp and !loopback and (tcp.DstPort == 80 or tcp.DstPort == 443) and localPort != {}",
        proxy_port
    );

    let handle = WinDivert::network(
        &filter,
        0,
        WinDivertFlags::empty(),
    ).map_err(|e| format!("Failed to open WinDivert: {:?}", e))?;

    let socket_filter = "true";
    let socket_handle = WinDivert::socket(
        socket_filter,
        0,
        WinDivertFlags::SNIFF | WinDivertFlags::RECV_ONLY,
    ).map_err(|e| format!("Failed to open WinDivert socket layer: {:?}", e))?;

    *status.write() = RedirectorStatus::Running;

    let status_clone = status.clone();
    let target_pids_clone = target_pids.clone();
    let proxy_addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), proxy_port);

    tokio::task::spawn_blocking(move || {
        let mut pid_connections: HashMap<(Ipv4Addr, u16, Ipv4Addr, u16), u32> = HashMap::new();
        let tracker = Arc::new(RwLock::new(ConnectionTracker::new()));
        let mut buffer = vec![0u8; 65535];

        loop {
            if shutdown_rx.try_recv().is_ok() {
                break;
            }

            if let Ok(packet) = socket_handle.recv(None) {
                if let Some(addr) = packet.address().socket() {
                    let pid = addr.process_id();
                    if let (Some(src_ip), Some(src_port), Some(dst_ip), Some(dst_port)) = 
                        (addr.local_address().ipv4(), addr.local_port(), 
                         addr.remote_address().ipv4(), addr.remote_port()) 
                    {
                        pid_connections.insert((src_ip, src_port, dst_ip, dst_port), pid);
                    }
                }
            }

            match handle.recv_ex(Some(&mut buffer), None) {
                Ok(packet) => {
                    let data = packet.data();
                    
                    if let Ok(parsed) = SlicedPacket::from_ip(data) {
                        if let Some(TransportSlice::Tcp(tcp)) = parsed.transport {
                            let (src_ip, dst_ip) = match parsed.ip {
                                Some(etherparse::InternetSlice::Ipv4(ipv4, _)) => {
                                    (ipv4.source_addr(), ipv4.destination_addr())
                                }
                                _ => {
                                    let _ = handle.send(&packet);
                                    continue;
                                }
                            };

                            let src_port = tcp.source_port();
                            let dst_port = tcp.destination_port();

                            let pid = pid_connections
                                .get(&(src_ip, src_port, dst_ip, dst_port))
                                .copied();

                            let should_redirect = if let Some(p) = pid {
                                target_pids_clone.read().contains(&p)
                            } else {
                                false
                            };

                            if should_redirect {
                                let src_addr = SocketAddr::new(IpAddr::V4(src_ip), src_port);
                                let original_dst = SocketAddr::new(IpAddr::V4(dst_ip), dst_port);

                                tracker.write().track(src_addr, proxy_addr, original_dst);

                                let mut modified_data = data.to_vec();
                                modify_destination(&mut modified_data, proxy_addr);

                                let _ = handle.send_ex(&modified_data, packet.address());

                                if let Some(p) = pid {
                                    let conn_info = ConnectionInfo {
                                        pid: p,
                                        process_name: String::new(),
                                        src_addr,
                                        dst_addr: proxy_addr,
                                        original_dst,
                                        protocol: Protocol::Tcp,
                                    };
                                    let _ = conn_tx.blocking_send(conn_info);
                                }
                            } else {
                                let _ = handle.send(&packet);
                            }
                        } else {
                            let _ = handle.send(&packet);
                        }
                    } else {
                        let _ = handle.send(&packet);
                    }
                }
                Err(_) => {
                    std::thread::sleep(std::time::Duration::from_millis(1));
                }
            }
        }

        *status_clone.write() = RedirectorStatus::Stopped;
    });

    Ok(conn_rx)
}

fn modify_destination(packet: &mut [u8], new_dst: SocketAddr) {
    if packet.len() < 20 {
        return;
    }

    let version = (packet[0] >> 4) & 0x0F;
    if version != 4 {
        return;
    }

    let ihl = (packet[0] & 0x0F) as usize * 4;
    if packet.len() < ihl + 4 {
        return;
    }

    if let IpAddr::V4(ipv4) = new_dst.ip() {
        let ip_bytes = ipv4.octets();
        packet[16..20].copy_from_slice(&ip_bytes);
    }

    let port_bytes = new_dst.port().to_be_bytes();
    packet[ihl + 2..ihl + 4].copy_from_slice(&port_bytes);

    recalculate_checksums(packet, ihl);
}

fn recalculate_checksums(packet: &mut [u8], ihl: usize) {
    packet[10] = 0;
    packet[11] = 0;
    
    let mut sum: u32 = 0;
    for i in (0..ihl).step_by(2) {
        let word = u16::from_be_bytes([packet[i], packet[i + 1]]);
        sum += word as u32;
    }
    while sum >> 16 != 0 {
        sum = (sum & 0xFFFF) + (sum >> 16);
    }
    let checksum = !sum as u16;
    packet[10..12].copy_from_slice(&checksum.to_be_bytes());

    let tcp_start = ihl;
    if packet.len() > tcp_start + 16 {
        packet[tcp_start + 16] = 0;
        packet[tcp_start + 17] = 0;
    }
}
