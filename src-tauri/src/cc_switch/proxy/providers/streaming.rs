//! 流式响应转换模块
//!
//! 实现 OpenAI SSE → Anthropic SSE 格式转换

use bytes::Bytes;
use futures::stream::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// OpenAI 流式响应数据结构
#[derive(Debug, Deserialize)]
struct OpenAIStreamChunk {
    id: String,
    model: String,
    choices: Vec<StreamChoice>,
    #[serde(default)]
    usage: Option<Usage>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    delta: Delta,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Delta {
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    reasoning: Option<String>, // OpenRouter 的推理内容
    #[serde(default)]
    tool_calls: Option<Vec<DeltaToolCall>>,
}

#[derive(Debug, Deserialize, Serialize)]
struct DeltaToolCall {
    index: usize,
    #[serde(default)]
    id: Option<String>,
    #[serde(rename = "type", default)]
    call_type: Option<String>,
    #[serde(default)]
    function: Option<DeltaFunction>,
}

#[derive(Debug, Deserialize, Serialize)]
struct DeltaFunction {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    arguments: Option<String>,
}

/// OpenAI 流式响应的 usage 信息（完整版）
#[derive(Debug, Deserialize)]
struct Usage {
    #[serde(default)]
    prompt_tokens: u32,
    #[serde(default)]
    completion_tokens: u32,
}

/// 创建 Anthropic SSE 流
pub fn create_anthropic_sse_stream(
    stream: impl Stream<Item = Result<Bytes, reqwest::Error>> + Send + 'static,
) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send {
    async_stream::stream! {
        let mut buffer = String::new();
        let mut message_id = None;
        let mut current_model = None;
        let mut content_index = 0;
        let mut has_sent_message_start = false;
        let mut has_sent_message_stop = false;
        let mut current_block_type: Option<String> = None;
        let mut tool_call_id = None;

        // 上游结束后补一个空行终结符：上游最后一个事件没有尾部空行时，
        // 残留 buffer 也能进入下方解析循环，而不是被静默丢弃
        let stream = stream.chain(futures::stream::iter(std::iter::once(Ok::<
            Bytes,
            reqwest::Error,
        >(Bytes::from("\n\n")))));

        tokio::pin!(stream);

        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(bytes) => {
                    let text = String::from_utf8_lossy(&bytes);
                    buffer.push_str(&text);

                    while let Some(pos) = buffer.find("\n\n") {
                        let line = buffer[..pos].to_string();
                        buffer = buffer[pos + 2..].to_string();

                        if line.trim().is_empty() {
                            continue;
                        }

                        for l in line.lines() {
                            if let Some(data) = l.strip_prefix("data: ") {
                                if data.trim() == "[DONE]" {
                                    log::debug!("[Claude/OpenRouter] <<< OpenAI SSE: [DONE]");
                                    let event = json!({"type": "message_stop"});
                                    let sse_data = format!("event: message_stop\ndata: {}\n\n",
                                        serde_json::to_string(&event).unwrap_or_default());
                                    log::debug!("[Claude/OpenRouter] >>> Anthropic SSE: message_stop");
                                    yield Ok(Bytes::from(sse_data));
                                    has_sent_message_stop = true;
                                    continue;
                                }

                                if let Ok(chunk) = serde_json::from_str::<OpenAIStreamChunk>(data) {
                                    log::debug!("[Claude/OpenRouter] <<< SSE chunk received");

                                    // stream_options.include_usage 的独立 usage chunk
                                    // （choices 为空数组）：转成 Anthropic message_delta，
                                    // 让下游能统计到用量
                                    if chunk.choices.is_empty() {
                                        if let Some(u) = &chunk.usage {
                                            let event = json!({
                                                "type": "message_delta",
                                                "delta": {},
                                                "usage": {
                                                    "input_tokens": u.prompt_tokens,
                                                    "output_tokens": u.completion_tokens
                                                }
                                            });
                                            let sse_data = format!("event: message_delta\ndata: {}\n\n",
                                                serde_json::to_string(&event).unwrap_or_default());
                                            log::debug!("[Claude/OpenRouter] >>> Anthropic SSE: message_delta (usage)");
                                            yield Ok(Bytes::from(sse_data));
                                        }
                                        continue;
                                    }

                                    if message_id.is_none() {
                                        message_id = Some(chunk.id.clone());
                                    }
                                    if current_model.is_none() {
                                        current_model = Some(chunk.model.clone());
                                    }

                                    if let Some(choice) = chunk.choices.first() {
                                        if !has_sent_message_start {
                                            let event = json!({
                                                "type": "message_start",
                                                "message": {
                                                    "id": message_id.clone().unwrap_or_default(),
                                                    "type": "message",
                                                    "role": "assistant",
                                                    "model": current_model.clone().unwrap_or_default(),
                                                    "usage": {
                                                        "input_tokens": 0,
                                                        "output_tokens": 0
                                                    }
                                                }
                                            });
                                            let sse_data = format!("event: message_start\ndata: {}\n\n",
                                                serde_json::to_string(&event).unwrap_or_default());
                                            yield Ok(Bytes::from(sse_data));
                                            has_sent_message_start = true;
                                        }

                                        // 处理 reasoning（thinking）
                                        if let Some(reasoning) = &choice.delta.reasoning {
                                            if current_block_type.is_none() {
                                                let event = json!({
                                                    "type": "content_block_start",
                                                    "index": content_index,
                                                    "content_block": {
                                                        "type": "thinking",
                                                        "thinking": ""
                                                    }
                                                });
                                                let sse_data = format!("event: content_block_start\ndata: {}\n\n",
                                                    serde_json::to_string(&event).unwrap_or_default());
                                                yield Ok(Bytes::from(sse_data));
                                                current_block_type = Some("thinking".to_string());
                                            }

                                            let event = json!({
                                                "type": "content_block_delta",
                                                "index": content_index,
                                                "delta": {
                                                    "type": "thinking_delta",
                                                    "thinking": reasoning
                                                }
                                            });
                                            let sse_data = format!("event: content_block_delta\ndata: {}\n\n",
                                                serde_json::to_string(&event).unwrap_or_default());
                                            yield Ok(Bytes::from(sse_data));
                                        }

                                        // 处理文本内容
                                        if let Some(content) = &choice.delta.content {
                                            if !content.is_empty() {
                                                if current_block_type.as_deref() != Some("text") {
                                                    if current_block_type.is_some() {
                                                        let event = json!({
                                                            "type": "content_block_stop",
                                                            "index": content_index
                                                        });
                                                        let sse_data = format!("event: content_block_stop\ndata: {}\n\n",
                                                            serde_json::to_string(&event).unwrap_or_default());
                                                        yield Ok(Bytes::from(sse_data));
                                                        content_index += 1;
                                                    }

                                                    let event = json!({
                                                        "type": "content_block_start",
                                                        "index": content_index,
                                                        "content_block": {
                                                            "type": "text",
                                                            "text": ""
                                                        }
                                                    });
                                                    let sse_data = format!("event: content_block_start\ndata: {}\n\n",
                                                        serde_json::to_string(&event).unwrap_or_default());
                                                    yield Ok(Bytes::from(sse_data));
                                                    current_block_type = Some("text".to_string());
                                                }

                                                let event = json!({
                                                    "type": "content_block_delta",
                                                    "index": content_index,
                                                    "delta": {
                                                        "type": "text_delta",
                                                        "text": content
                                                    }
                                                });
                                                let sse_data = format!("event: content_block_delta\ndata: {}\n\n",
                                                    serde_json::to_string(&event).unwrap_or_default());
                                                yield Ok(Bytes::from(sse_data));
                                            }
                                        }

                                        // 处理工具调用
                                        if let Some(tool_calls) = &choice.delta.tool_calls {
                                            for tool_call in tool_calls {
                                                if let Some(id) = &tool_call.id {
                                                    if current_block_type.is_some() {
                                                        let event = json!({
                                                            "type": "content_block_stop",
                                                            "index": content_index
                                                        });
                                                        let sse_data = format!("event: content_block_stop\ndata: {}\n\n",
                                                            serde_json::to_string(&event).unwrap_or_default());
                                                        yield Ok(Bytes::from(sse_data));
                                                        content_index += 1;
                                                    }

                                                    tool_call_id = Some(id.clone());
                                                }

                                                if let Some(function) = &tool_call.function {
                                                    if let Some(name) = &function.name {
                                                        let event = json!({
                                                            "type": "content_block_start",
                                                            "index": content_index,
                                                            "content_block": {
                                                                "type": "tool_use",
                                                                "id": tool_call_id.clone().unwrap_or_default(),
                                                                "name": name
                                                            }
                                                        });
                                                        let sse_data = format!("event: content_block_start\ndata: {}\n\n",
                                                            serde_json::to_string(&event).unwrap_or_default());
                                                        yield Ok(Bytes::from(sse_data));
                                                        current_block_type = Some("tool_use".to_string());
                                                    }

                                                    if let Some(args) = &function.arguments {
                                                        let event = json!({
                                                            "type": "content_block_delta",
                                                            "index": content_index,
                                                            "delta": {
                                                                "type": "input_json_delta",
                                                                "partial_json": args
                                                            }
                                                        });
                                                        let sse_data = format!("event: content_block_delta\ndata: {}\n\n",
                                                            serde_json::to_string(&event).unwrap_or_default());
                                                        yield Ok(Bytes::from(sse_data));
                                                    }
                                                }
                                            }
                                        }

                                        // 处理 finish_reason
                                        if let Some(finish_reason) = &choice.finish_reason {
                                            if current_block_type.is_some() {
                                                let event = json!({
                                                    "type": "content_block_stop",
                                                    "index": content_index
                                                });
                                                let sse_data = format!("event: content_block_stop\ndata: {}\n\n",
                                                    serde_json::to_string(&event).unwrap_or_default());
                                                yield Ok(Bytes::from(sse_data));
                                                // 标记 block 已闭合，避免收尾合成时重复发送
                                                current_block_type = None;
                                            }

                                            let stop_reason = map_stop_reason(Some(finish_reason));
                                            // 构建 usage 信息，包含 input_tokens 和 output_tokens
                                            let usage_json = chunk.usage.as_ref().map(|u| json!({
                                                "input_tokens": u.prompt_tokens,
                                                "output_tokens": u.completion_tokens
                                            }));
                                            let event = json!({
                                                "type": "message_delta",
                                                "delta": {
                                                    "stop_reason": stop_reason,
                                                    "stop_sequence": null
                                                },
                                                "usage": usage_json
                                            });
                                            let sse_data = format!("event: message_delta\ndata: {}\n\n",
                                                serde_json::to_string(&event).unwrap_or_default());
                                            yield Ok(Bytes::from(sse_data));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("Stream error: {e}");
                    let error_event = json!({
                        "type": "error",
                        "error": {
                            "type": "stream_error",
                            "message": format!("Stream error: {e}")
                        }
                    });
                    let sse_data = format!("event: error\ndata: {}\n\n",
                        serde_json::to_string(&error_event).unwrap_or_default());
                    yield Ok(Bytes::from(sse_data));
                    // 错误后补发 message_stop，让下游能正常收尾
                    if !has_sent_message_stop {
                        let event = json!({"type": "message_stop"});
                        let sse_data = format!("event: message_stop\ndata: {}\n\n",
                            serde_json::to_string(&event).unwrap_or_default());
                        yield Ok(Bytes::from(sse_data));
                        has_sent_message_stop = true;
                    }
                    break;
                }
            }
        }

        // 流自然结束但未见 [DONE]：补发收尾事件，避免下游悬挂
        if has_sent_message_start && !has_sent_message_stop {
            if current_block_type.is_some() {
                let event = json!({"type": "content_block_stop", "index": content_index});
                let sse_data = format!("event: content_block_stop\ndata: {}\n\n",
                    serde_json::to_string(&event).unwrap_or_default());
                yield Ok(Bytes::from(sse_data));
            }
            let event = json!({"type": "message_stop"});
            let sse_data = format!("event: message_stop\ndata: {}\n\n",
                serde_json::to_string(&event).unwrap_or_default());
            yield Ok(Bytes::from(sse_data));
        }
    }
}

/// 映射停止原因
fn map_stop_reason(finish_reason: Option<&str>) -> Option<String> {
    finish_reason.map(|r| {
        match r {
            "tool_calls" => "tool_use",
            "stop" => "end_turn",
            "length" => "max_tokens",
            _ => "end_turn",
        }
        .to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chunk_json(content: &str, finish_reason: Option<&str>) -> String {
        let fr = finish_reason
            .map(|f| format!(r#","finish_reason":"{f}""#))
            .unwrap_or_default();
        format!(
            r#"{{"id":"chatcmpl-1","model":"test-model","choices":[{{"delta":{{"content":"{content}"}}{fr}}}]}}"#
        )
    }

    async fn collect_sse(chunks: Vec<Result<Bytes, reqwest::Error>>) -> String {
        create_anthropic_sse_stream(futures::stream::iter(chunks))
            .map(|r| r.unwrap())
            .collect::<Vec<_>>()
            .await
            .iter()
            .map(|b| String::from_utf8_lossy(b).to_string())
            .collect()
    }

    #[tokio::test]
    async fn trailing_event_without_blank_line_is_flushed() {
        // 最后一个事件没有尾部空行，仍应被解析转发
        let input = format!(
            "data: {}\n\ndata: {}",
            chunk_json("hello", None),
            chunk_json(" world", None),
        );
        let sse = collect_sse(vec![Ok(Bytes::from(input))]).await;
        assert!(sse.contains("message_start"));
        assert!(sse.contains("hello"));
        assert!(sse.contains(" world"));
        assert!(sse.contains("message_stop"));
    }

    #[tokio::test]
    async fn stream_end_without_done_synthesizes_message_stop() {
        let input = format!("data: {}\n\n", chunk_json("hi", Some("stop")));
        let sse = collect_sse(vec![Ok(Bytes::from(input))]).await;
        let stop_pos = sse
            .find("event: message_stop")
            .expect("未见 [DONE] 时应合成 message_stop");
        // message_stop 之前 block 应已闭合，且 finish_reason 已闭合的不重复发
        assert!(sse[..stop_pos].contains("content_block_stop"));
        assert_eq!(sse.matches("event: content_block_stop").count(), 1);
    }

    #[tokio::test]
    async fn error_path_emits_message_stop() {
        // 端口 1 必然连接失败，用来构造真实的 reqwest::Error
        let err = reqwest::get("http://127.0.0.1:1").await.unwrap_err();
        let sse = collect_sse(vec![
            Ok(Bytes::from(format!("data: {}\n\n", chunk_json("hi", None)))),
            Err(err),
        ])
        .await;
        let err_pos = sse.find("event: error").expect("应有 error 事件");
        assert!(sse[err_pos..].contains("event: message_stop"));
    }
}
