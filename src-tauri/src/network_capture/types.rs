use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturedRequest {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub scheme: String,
    pub request_headers: HashMap<String, String>,
    pub request_body: Option<Vec<u8>>,
    pub request_body_text: Option<String>,
    pub response: Option<CapturedResponse>,
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturedResponse {
    pub status_code: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: Option<Vec<u8>>,
    pub body_text: Option<String>,
    pub content_type: Option<String>,
    pub content_length: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FilterCriteria {
    pub url_pattern: Option<String>,
    pub methods: Option<Vec<String>>,
    pub status_codes: Option<Vec<u16>>,
    pub content_type: Option<String>,
    pub search_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub running: bool,
    pub port: u16,
    pub request_count: usize,
    pub ca_installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaInfo {
    pub exists: bool,
    pub path: String,
    pub pem: Option<String>,
}

impl CapturedRequest {
    pub fn new(
        method: String,
        url: String,
        host: String,
        path: String,
        scheme: String,
        headers: HashMap<String, String>,
        body: Option<Vec<u8>>,
    ) -> Self {
        let body_text = body
            .as_ref()
            .and_then(|b| String::from_utf8(b.clone()).ok());
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            method,
            url,
            host,
            path,
            scheme,
            request_headers: headers,
            request_body: body,
            request_body_text: body_text,
            response: None,
            duration_ms: None,
        }
    }

    pub fn set_response(&mut self, response: CapturedResponse, duration_ms: u64) {
        self.response = Some(response);
        self.duration_ms = Some(duration_ms);
    }
}

impl CapturedResponse {
    pub fn new(
        status_code: u16,
        status_text: String,
        headers: HashMap<String, String>,
        body: Option<Vec<u8>>,
    ) -> Self {
        let content_type = headers.get("content-type").cloned();
        let content_length = body.as_ref().map(|b| b.len());
        let body_text = body.as_ref().and_then(|b| {
            if let Some(ref ct) = content_type {
                if ct.contains("text")
                    || ct.contains("json")
                    || ct.contains("xml")
                    || ct.contains("html")
                {
                    return String::from_utf8(b.clone()).ok();
                }
            }
            None
        });

        Self {
            status_code,
            status_text,
            headers,
            body,
            body_text,
            content_type,
            content_length,
        }
    }
}
