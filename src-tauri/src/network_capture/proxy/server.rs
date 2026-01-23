use crate::network_capture::certificate::ca::CaManager;
use crate::network_capture::types::CapturedRequest;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::mpsc;

pub struct ProxyServer {
    port: u16,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
    running: Arc<AtomicBool>,
}

impl ProxyServer {
    pub fn new(
        port: u16,
        ca_manager: Arc<CaManager>,
        request_tx: mpsc::Sender<CapturedRequest>,
    ) -> Self {
        Self {
            port,
            ca_manager,
            request_tx,
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn start(&self) -> Result<(), String> {
        let addr = SocketAddr::from(([127, 0, 0, 1], self.port));
        let listener = TcpListener::bind(addr)
            .await
            .map_err(|e| format!("Failed to bind port {}: {}", self.port, e))?;

        self.running.store(true, Ordering::SeqCst);

        let running = self.running.clone();
        let ca_manager = self.ca_manager.clone();
        let request_tx = self.request_tx.clone();

        tokio::spawn(async move {
            loop {
                if !running.load(Ordering::SeqCst) {
                    break;
                }

                tokio::select! {
                    result = listener.accept() => {
                        match result {
                            Ok((stream, addr)) => {
                                let ca = ca_manager.clone();
                                let tx = request_tx.clone();
                                tokio::spawn(async move {
                                    if let Err(e) = super::http_handler::handle_connection(stream, addr, ca, tx).await {
                                        eprintln!("Connection error from {}: {}", addr, e);
                                    }
                                });
                            }
                            Err(e) => {
                                eprintln!("Accept error: {}", e);
                            }
                        }
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }
                    }
                }
            }
        });

        Ok(())
    }

    pub async fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}
