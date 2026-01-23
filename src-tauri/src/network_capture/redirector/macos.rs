use super::types::{ConnectionInfo, Protocol, RedirectorStatus};
use super::Redirector;
use tokio::sync::mpsc;

pub async fn start_redirector(
    _redirector: &mut Redirector,
) -> Result<mpsc::Receiver<ConnectionInfo>, String> {
    let (conn_tx, conn_rx) = mpsc::channel::<ConnectionInfo>(1000);
    
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    
    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    break;
                },
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(10)) => {
                continue;
                }
            }
        }
    });

    Ok(conn_rx)
}
