//! 文本哈希工具：MD5 等哈希计算

use md5::{Digest, Md5};

fn md5_hex(text: &str) -> String {
    let mut hasher = Md5::new();
    hasher.update(text.as_bytes());
    hasher
        .finalize()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect()
}

/// 计算文本的 MD5 哈希（小写 hex）
#[tauri::command]
pub async fn hash_md5(text: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || md5_hex(&text))
        .await
        .map_err(|e| format!("异步任务执行失败: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_md5_known_vectors() {
        assert_eq!(md5_hex(""), "d41d8cd98f00b204e9800998ecf8427e");
        assert_eq!(md5_hex("abc"), "900150983cd24fb0d6963f7d28e17f72");
    }
}
