use std::collections::HashSet;
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::mpsc;

pub mod types;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

use types::{RedirectorConfig, RedirectorStatus, ConnectionInfo};

pub struct Redirector {
    pub config: RedirectorConfig,
    pub target_pids: Arc<RwLock<HashSet<u32>>>,
    pub status: Arc<RwLock<RedirectorStatus>>,
    pub connection_tx: Option<mpsc::Sender<ConnectionInfo>>,
    pub shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl Redirector {
    pub fn new(config: RedirectorConfig) -> Self {
        Self {
            config,
            target_pids: Arc::new(RwLock::new(HashSet::new())),
            status: Arc::new(RwLock::new(RedirectorStatus::Stopped)),
            connection_tx: None,
            shutdown_tx: None,
        }
    }

    pub fn add_pid(&self, pid: u32) {
        self.target_pids.write().insert(pid);
    }

    pub fn remove_pid(&self, pid: u32) {
        self.target_pids.write().remove(&pid);
    }

    pub fn set_pids(&self, pids: Vec<u32>) {
        let mut guard = self.target_pids.write();
        guard.clear();
        for pid in pids {
            guard.insert(pid);
        }
    }

    pub fn clear_pids(&self) {
        self.target_pids.write().clear();
    }

    pub fn get_pids(&self) -> Vec<u32> {
        self.target_pids.read().iter().copied().collect()
    }

    pub fn status(&self) -> RedirectorStatus {
        self.status.read().clone()
    }

    #[cfg(target_os = "windows")]
    pub async fn start(&mut self) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
        windows::start_redirector(self).await
    }

    #[cfg(target_os = "macos")]
    pub async fn start(&mut self) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
        macos::start_redirector(self).await
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    pub async fn start(&mut self) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
        Err("Redirector not supported on this platform".to_string())
    }

    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
        *self.status.write() = RedirectorStatus::Stopped;
        Ok(())
    }
}
