use crate::network_capture::certificate::ca::CaManager;
use crate::network_capture::types::{CapturedRequest, CapturedResponse};
use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::body::Incoming;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use rustls::ServerConfig;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_rustls::TlsAcceptor;

pub async fn handle_transparent_tls(
    stream: TcpStream,
    host: &str,
    _original_dst: SocketAddr,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let (cert_pem, key_pem) = ca_manager.sign_cert_for_domain(host)?;

    let certs = rustls_pemfile::certs(&mut cert_pem.as_bytes())
        .filter_map(|r| r.ok())
        .map(CertificateDer::from)
        .collect::<Vec<_>>();

    let key = rustls_pemfile::private_key(&mut key_pem.as_bytes())?
        .ok_or("No private key found")?;
    let key = PrivateKeyDer::try_from(key)?;

    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)?;

    let acceptor = TlsAcceptor::from(Arc::new(config));
    let tls_stream = acceptor.accept(stream).await?;

    let host_clone = host.to_string();
    let io = TokioIo::new(tls_stream);

    let service = service_fn(move |req: Request<Incoming>| {
        let host = host_clone.clone();
        let tx = request_tx.clone();
        async move { handle_https_request(req, &host, tx).await }
    });

    http1::Builder::new()
        .preserve_header_case(true)
        .title_case_headers(true)
        .serve_connection(io, service)
        .await?;

    Ok(())
}

pub async fn handle_connect(
    req: Request<Incoming>,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let host = req
        .uri()
        .authority()
        .map(|a| a.host().to_string())
        .unwrap_or_default();
    let _port = req.uri().authority().and_then(|a| a.port_u16()).unwrap_or(443);

    tokio::spawn(async move {
        match hyper::upgrade::on(req).await {
            Ok(upgraded) => {
                let io = TokioIo::new(upgraded);
                if let Err(e) = handle_https_tunnel(io, &host, ca_manager, request_tx).await {
                    eprintln!("HTTPS tunnel error for {}: {}", host, e);
                }
            }
            Err(e) => {
                eprintln!("Upgrade error: {}", e);
            }
        }
    });

    Ok(Response::new(Full::new(Bytes::new())))
}

async fn handle_https_tunnel<I>(
    upgraded: I,
    host: &str,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
where
    I: AsyncRead + AsyncWrite + Unpin + Send + 'static,
{
    let (cert_pem, key_pem) = ca_manager.sign_cert_for_domain(host)?;

    let certs = rustls_pemfile::certs(&mut cert_pem.as_bytes())
        .filter_map(|r| r.ok())
        .map(CertificateDer::from)
        .collect::<Vec<_>>();

    let key = rustls_pemfile::private_key(&mut key_pem.as_bytes())?
        .ok_or("No private key found")?;
    let key = PrivateKeyDer::try_from(key)?;

    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)?;

    let acceptor = TlsAcceptor::from(Arc::new(config));
    let tls_stream = acceptor.accept(upgraded).await?;

    let host_clone = host.to_string();
    let io = TokioIo::new(tls_stream);

    let service = service_fn(move |req: Request<Incoming>| {
        let host = host_clone.clone();
        let tx = request_tx.clone();
        async move { handle_https_request(req, &host, tx).await }
    });

    http1::Builder::new()
        .preserve_header_case(true)
        .title_case_headers(true)
        .serve_connection(io, service)
        .await?;

    Ok(())
}

async fn handle_https_request(
    req: Request<Incoming>,
    host: &str,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let start = Instant::now();
    let method = req.method().to_string();
    let path = req.uri().path_and_query().map(|p| p.to_string()).unwrap_or_else(|| "/".to_string());
    let url = format!("https://{}{}", host, path);

    let mut headers = HashMap::new();
    for (name, value) in req.headers() {
        if let Ok(v) = value.to_str() {
            headers.insert(name.to_string(), v.to_string());
        }
    }

    let body_bytes = match req.collect().await {
        Ok(collected) => Some(collected.to_bytes().to_vec()),
        Err(_) => None,
    };

    let mut captured = CapturedRequest::new(
        method.clone(),
        url.clone(),
        host.to_string(),
        path.clone(),
        "https".to_string(),
        headers.clone(),
        body_bytes.clone(),
    );

    let response = forward_https_request(&method, &url, &headers, body_bytes).await;

    match response {
        Ok((status, resp_headers, resp_body)) => {
            let duration = start.elapsed().as_millis() as u64;
            let captured_response = CapturedResponse::new(
                status,
                status_text(status),
                resp_headers.clone(),
                Some(resp_body.clone()),
            );
            captured.set_response(captured_response, duration);
            let _ = request_tx.send(captured).await;

            let mut builder = Response::builder().status(status);
            for (k, v) in resp_headers {
                if !k.eq_ignore_ascii_case("transfer-encoding") && !k.eq_ignore_ascii_case("content-length") {
                    builder = builder.header(&k, &v);
                }
            }
            builder = builder.header("content-length", resp_body.len());

            Ok(builder
                .body(Full::new(Bytes::from(resp_body)))
                .unwrap_or_else(|_| {
                    Response::builder()
                        .status(502)
                        .body(Full::new(Bytes::from("Bad Gateway")))
                        .unwrap()
                }))
        }
        Err(e) => {
            let duration = start.elapsed().as_millis() as u64;
            let captured_response = CapturedResponse::new(
                502,
                "Bad Gateway".to_string(),
                HashMap::new(),
                Some(e.as_bytes().to_vec()),
            );
            captured.set_response(captured_response, duration);
            let _ = request_tx.send(captured).await;

            Ok(Response::builder()
                .status(502)
                .body(Full::new(Bytes::from(format!("Proxy Error: {}", e))))
                .unwrap())
        }
    }
}

async fn forward_https_request(
    method: &str,
    url: &str,
    headers: &HashMap<String, String>,
    body: Option<Vec<u8>>,
) -> Result<(u16, HashMap<String, String>, Vec<u8>), String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let mut req_builder = match method {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        "PATCH" => client.patch(url),
        "HEAD" => client.head(url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, url),
        _ => client.request(
            reqwest::Method::from_bytes(method.as_bytes()).unwrap_or(reqwest::Method::GET),
            url,
        ),
    };

    for (k, v) in headers {
        if !k.eq_ignore_ascii_case("host")
            && !k.eq_ignore_ascii_case("content-length")
            && !k.eq_ignore_ascii_case("transfer-encoding")
            && !k.eq_ignore_ascii_case("connection")
        {
            req_builder = req_builder.header(k, v);
        }
    }

    if let Some(b) = body {
        if !b.is_empty() {
            req_builder = req_builder.body(b);
        }
    }

    let response = req_builder.send().await.map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let mut resp_headers = HashMap::new();
    for (k, v) in response.headers() {
        if let Ok(val) = v.to_str() {
            resp_headers.insert(k.to_string(), val.to_string());
        }
    }

    let resp_body = response.bytes().await.map_err(|e| e.to_string())?;

    Ok((status, resp_headers, resp_body.to_vec()))
}

fn status_text(code: u16) -> String {
    match code {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        _ => "Unknown",
    }
    .to_string()
}
