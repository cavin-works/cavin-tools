use crate::network_capture::types::{CapturedRequest, FilterCriteria};
use lru::LruCache;
use std::num::NonZeroUsize;
use tokio::sync::RwLock;

pub struct RequestStore {
    cache: RwLock<LruCache<String, CapturedRequest>>,
}

impl RequestStore {
    pub fn new(max_size: usize) -> Self {
        Self {
            cache: RwLock::new(LruCache::new(NonZeroUsize::new(max_size).unwrap())),
        }
    }

    pub async fn add(&self, request: CapturedRequest) {
        self.cache.write().await.put(request.id.clone(), request);
    }

    pub async fn get(&self, id: &str) -> Option<CapturedRequest> {
        self.cache.write().await.get(id).cloned()
    }

    pub async fn get_all(&self) -> Vec<CapturedRequest> {
        let cache = self.cache.read().await;
        cache.iter().map(|(_, v)| v.clone()).collect()
    }

    pub async fn get_filtered(&self, filter: Option<FilterCriteria>) -> Vec<CapturedRequest> {
        let all = self.get_all().await;

        match filter {
            None => all,
            Some(f) => all
                .into_iter()
                .filter(|req| {
                    if let Some(ref pattern) = f.url_pattern {
                        if !pattern.is_empty() && !req.url.to_lowercase().contains(&pattern.to_lowercase()) {
                            return false;
                        }
                    }

                    if let Some(ref methods) = f.methods {
                        if !methods.is_empty() && !methods.contains(&req.method) {
                            return false;
                        }
                    }

                    if let Some(ref status_codes) = f.status_codes {
                        if !status_codes.is_empty() {
                            if let Some(ref resp) = req.response {
                                if !status_codes.contains(&resp.status_code) {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        }
                    }

                    if let Some(ref content_type) = f.content_type {
                        if !content_type.is_empty() {
                            if let Some(ref resp) = req.response {
                                if let Some(ref ct) = resp.content_type {
                                    if !ct.to_lowercase().contains(&content_type.to_lowercase()) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        }
                    }

                    if let Some(ref search) = f.search_text {
                        if !search.is_empty() {
                            let search_lower = search.to_lowercase();
                            let in_url = req.url.to_lowercase().contains(&search_lower);
                            let in_req_body = req
                                .request_body_text
                                .as_ref()
                                .map(|b| b.to_lowercase().contains(&search_lower))
                                .unwrap_or(false);
                            let in_res_body = req
                                .response
                                .as_ref()
                                .and_then(|r| r.body_text.as_ref())
                                .map(|b| b.to_lowercase().contains(&search_lower))
                                .unwrap_or(false);

                            if !in_url && !in_req_body && !in_res_body {
                                return false;
                            }
                        }
                    }

                    true
                })
                .collect()
        }
    }

    pub async fn clear(&self) {
        self.cache.write().await.clear();
    }

    pub async fn len(&self) -> usize {
        self.cache.read().await.len()
    }
}
