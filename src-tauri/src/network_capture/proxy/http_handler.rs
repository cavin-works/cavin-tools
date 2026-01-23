use crate::network_capture::certificate::ca::CaManager;
use crate::network_capture::types::{CapturedRequest, CapturedResponse};
use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::body::Incoming;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper_util::rt::TokioIo;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;
use tokio::net::TcpStream;
use tokio::sync::mpsc;

pub struct ConnectionContext {
    pub original_dst: Option<SocketAddr>,
    pub is_transparent: bool,
}

impl Default for ConnectionContext {
    fn default() -> Self {
        Self {
            original_dst: None,
            is_transparent: false,
        }
    }
}

pub async fn handle_connection(
    stream: TcpStream,
    _addr: SocketAddr,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    handle_connection_with_context(stream, _addr, ca_manager, request_tx, ConnectionContext::default()).await
}

pub async fn handle_connection_with_context(
    stream: TcpStream,
    _addr: SocketAddr,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
    ctx: ConnectionContext,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if ctx.is_transparent {
        return handle_transparent_connection(stream, ca_manager, request_tx, ctx).await;
    }

    let io = TokioIo::new(stream);
    let ca = ca_manager.clone();
    let tx = request_tx.clone();

    let service = service_fn(move |req: Request<Incoming>| {
        let ca = ca.clone();
        let tx = tx.clone();
        async move { handle_request(req, ca, tx).await }
    });

    http1::Builder::new()
        .preserve_header_case(true)
        .title_case_headers(true)
        .serve_connection(io, service)
        .with_upgrades()
        .await?;

    Ok(())
}

async fn handle_transparent_connection(
    stream: TcpStream,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
    ctx: ConnectionContext,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let original_dst = ctx.original_dst.ok_or("No original destination for transparent proxy")?;
    
    let mut peek_buf = [0u8; 1];
    stream.peek(&mut peek_buf).await?;

    let is_tls = peek_buf[0] == 0x16;

    if is_tls {
        let mut client_hello = vec![0u8; 1024];
        let n = stream.peek(&mut client_hello).await?;
        let sni = extract_sni(&client_hello[..n]);
        let host = sni.unwrap_or_else(|| original_dst.ip().to_string());

        super::https_handler::handle_transparent_tls(
            stream,
            &host,
            original_dst,
            ca_manager,
            request_tx,
        ).await
    } else {
        handle_transparent_http(stream, original_dst, request_tx).await
    }
}

async fn handle_transparent_http(
    stream: TcpStream,
    original_dst: SocketAddr,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let io = TokioIo::new(stream);
    let tx = request_tx.clone();
    let dst = original_dst;

    let service = service_fn(move |req: Request<Incoming>| {
        let tx = tx.clone();
        let original_dst = dst;
        async move { handle_transparent_request(req, original_dst, tx).await }
    });

    http1::Builder::new()
        .preserve_header_case(true)
        .title_case_headers(true)
        .serve_connection(io, service)
        .await?;

    Ok(())
}

async fn handle_transparent_request(
    req: Request<Incoming>,
    original_dst: SocketAddr,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    let start = Instant::now();
    let method = req.method().to_string();
    let path = req.uri().path_and_query().map(|p| p.to_string()).unwrap_or_else(|| "/".to_string());
    
    let host = req.headers()
        .get("host")
        .and_then(|h| h.to_str().ok())
        .map(|h| h.to_string())
        .unwrap_or_else(|| original_dst.to_string());

    let url = format!("http://{}{}", host, path);

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
        host.clone(),
        path,
        "http".to_string(),
        headers.clone(),
        body_bytes.clone(),
    );

    let response = forward_http_request(&method, &url, &headers, body_bytes).await;

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
                builder = builder.header(k, v);
            }
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

fn extract_sni(data: &[u8]) -> Option<String> {
    if data.len() < 43 {
        return None;
    }

    if data[0] != 0x16 || data[1] != 0x03 {
        return None;
    }

    let mut pos = 43;
    
    if pos >= data.len() {
        return None;
    }
    let session_id_len = data[pos] as usize;
    pos += 1 + session_id_len;

    if pos + 2 > data.len() {
        return None;
    }
    let cipher_suites_len = u16::from_be_bytes([data[pos], data[pos + 1]]) as usize;
    pos += 2 + cipher_suites_len;

    if pos >= data.len() {
        return None;
    }
    let compression_len = data[pos] as usize;
    pos += 1 + compression_len;

    if pos + 2 > data.len() {
        return None;
    }
    let extensions_len = u16::from_be_bytes([data[pos], data[pos + 1]]) as usize;
    pos += 2;

    let extensions_end = pos + extensions_len;
    while pos + 4 <= extensions_end && pos + 4 <= data.len() {
        let ext_type = u16::from_be_bytes([data[pos], data[pos + 1]]);
        let ext_len = u16::from_be_bytes([data[pos + 2], data[pos + 3]]) as usize;
        pos += 4;

        if ext_type == 0 {
            if pos + 2 > data.len() {
                return None;
            }
            let sni_list_len = u16::from_be_bytes([data[pos], data[pos + 1]]) as usize;
            pos += 2;

            if pos + sni_list_len > data.len() {
                return None;
            }

            let mut sni_pos = pos;
            while sni_pos + 3 <= pos + sni_list_len {
                let name_type = data[sni_pos];
                let name_len = u16::from_be_bytes([data[sni_pos + 1], data[sni_pos + 2]]) as usize;
                sni_pos += 3;

                if name_type == 0 && sni_pos + name_len <= data.len() {
                    return String::from_utf8(data[sni_pos..sni_pos + name_len].to_vec()).ok();
                }
                sni_pos += name_len;
            }
            return None;
        }
        pos += ext_len;
    }

    None
}

async fn handle_request(
    req: Request<Incoming>,
    ca_manager: Arc<CaManager>,
    request_tx: mpsc::Sender<CapturedRequest>,
) -> Result<Response<Full<Bytes>>, hyper::Error> {
    if req.method() == Method::CONNECT {
        return super::https_handler::handle_connect(req, ca_manager, request_tx).await;
    }

    let start = Instant::now();
    let method = req.method().to_string();
    let uri = req.uri().clone();
    let url = uri.to_string();
    let host = uri.host().unwrap_or("").to_string();
    let path = uri.path().to_string();

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
        host.clone(),
        path,
        "http".to_string(),
        headers.clone(),
        body_bytes.clone(),
    );

    let response = forward_http_request(&method, &url, &headers, body_bytes).await;

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
                builder = builder.header(k, v);
            }
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

async fn forward_http_request(
    method: &str,
    url: &str,
    headers: &HashMap<String, String>,
    body: Option<Vec<u8>>,
) -> Result<(u16, HashMap<String, String>, Vec<u8>), String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(false)
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
        _ => client.request(reqwest::Method::from_bytes(method.as_bytes()).unwrap(), url),
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
        req_builder = req_builder.body(b);
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
