//! 使用统计相关命令

use crate::cc_switch::error::AppError;
use crate::cc_switch::services::usage_stats::*;
use crate::cc_switch::store::AppState;
use tauri::State;

/// 获取使用量汇总
#[tauri::command]
pub fn get_usage_summary(
    state: State<'_, AppState>,
    start_date: Option<i64>,
    end_date: Option<i64>,
) -> Result<UsageSummary, AppError> {
    state.db.get_usage_summary(start_date, end_date)
}

/// 获取每日趋势
#[tauri::command]
pub fn get_usage_trends(
    state: State<'_, AppState>,
    start_date: Option<i64>,
    end_date: Option<i64>,
) -> Result<Vec<DailyStats>, AppError> {
    state.db.get_daily_trends(start_date, end_date)
}

/// 获取 Provider 统计
#[tauri::command]
pub fn get_provider_stats(state: State<'_, AppState>) -> Result<Vec<ProviderStats>, AppError> {
    state.db.get_provider_stats()
}

/// 获取模型统计
#[tauri::command]
pub fn get_model_stats(state: State<'_, AppState>) -> Result<Vec<ModelStats>, AppError> {
    state.db.get_model_stats()
}

/// 获取请求日志列表
#[tauri::command]
pub fn get_request_logs(
    state: State<'_, AppState>,
    filters: LogFilters,
    page: u32,
    page_size: u32,
) -> Result<PaginatedLogs, AppError> {
    state.db.get_request_logs(&filters, page, page_size)
}

/// 获取单个请求详情
#[tauri::command]
pub fn get_request_detail(
    state: State<'_, AppState>,
    request_id: String,
) -> Result<Option<RequestLogDetail>, AppError> {
    state.db.get_request_detail(&request_id)
}

/// 获取模型定价列表
#[tauri::command]
pub fn get_model_pricing(state: State<'_, AppState>) -> Result<Vec<ModelPricingInfo>, AppError> {
    log::info!("获取模型定价列表");
    state.db.ensure_model_pricing_seeded()?;

    let db = state.db.clone();
    let conn = crate::cc_switch::database::lock_conn!(db.conn);

    // 检查表是否存在
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='model_pricing'",
            [],
            |row| row.get::<_, i64>(0).map(|count| count > 0),
        )
        .unwrap_or(false);

    if !table_exists {
        log::error!("model_pricing 表不存在,可能需要重启应用以触发数据库迁移");
        return Ok(Vec::new());
    }

    let mut stmt = conn.prepare(
        "SELECT model_id, display_name, input_cost_per_million, output_cost_per_million,
                cache_read_cost_per_million, cache_creation_cost_per_million
         FROM model_pricing
         ORDER BY display_name",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(ModelPricingInfo {
            model_id: row.get(0)?,
            display_name: row.get(1)?,
            input_cost_per_million: row.get(2)?,
            output_cost_per_million: row.get(3)?,
            cache_read_cost_per_million: row.get(4)?,
            cache_creation_cost_per_million: row.get(5)?,
        })
    })?;

    let mut pricing = Vec::new();
    for row in rows {
        pricing.push(row?);
    }

    log::info!("成功获取 {} 条模型定价数据", pricing.len());
    Ok(pricing)
}

/// 更新模型定价
#[tauri::command]
pub fn update_model_pricing(
    state: State<'_, AppState>,
    model_id: String,
    display_name: String,
    input_cost: String,
    output_cost: String,
    cache_read_cost: String,
    cache_creation_cost: String,
) -> Result<(), AppError> {
    let db = state.db.clone();
    let conn = crate::cc_switch::database::lock_conn!(db.conn);

    conn.execute(
        "INSERT OR REPLACE INTO model_pricing (
            model_id, display_name, input_cost_per_million, output_cost_per_million,
            cache_read_cost_per_million, cache_creation_cost_per_million
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            model_id,
            display_name,
            input_cost,
            output_cost,
            cache_read_cost,
            cache_creation_cost
        ],
    )
    .map_err(|e| AppError::Database(format!("更新模型定价失败: {e}")))?;

    Ok(())
}

/// CSV 字段转义：含逗号/引号/换行时包引号，内部双引号翻倍
fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') || s.contains('\r') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

/// 导出用量报表 CSV（UTF-8 BOM，Excel 中文兼容）
#[tauri::command]
pub fn export_usage_csv(
    state: State<'_, AppState>,
    range_days: Option<i64>,
    save_path: String,
) -> Result<usize, String> {
    use chrono::{Local, TimeZone};

    let start_date = range_days.map(|n| Local::now().timestamp() - n * 24 * 60 * 60);
    let logs = state
        .db
        .get_request_logs_for_export(start_date, None)
        .map_err(|e| e.to_string())?;

    let mut csv = String::from('\u{FEFF}'); // UTF-8 BOM
    csv.push_str("时间,供应商,应用,模型,输入Token,输出Token,缓存命中Token,缓存创建Token,总Token,成本(USD),状态码,延迟(ms)\n");

    for log in &logs {
        let time = Local
            .timestamp_opt(log.created_at, 0)
            .single()
            .map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| log.created_at.to_string());
        let provider = log
            .provider_name
            .clone()
            .unwrap_or_else(|| log.provider_id.clone());

        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{},{}\n",
            csv_escape(&time),
            csv_escape(&provider),
            csv_escape(&log.app_type),
            csv_escape(&log.model),
            log.input_tokens,
            log.output_tokens,
            log.cache_read_tokens,
            log.cache_creation_tokens,
            log.input_tokens + log.output_tokens,
            log.total_cost_usd,
            log.status_code,
            log.latency_ms,
        ));
    }

    std::fs::write(&save_path, csv).map_err(|e| format!("写入 CSV 文件失败: {e}"))?;
    log::info!("已导出 {} 条用量记录到 {save_path}", logs.len());
    Ok(logs.len())
}

/// 检查 Provider 使用限额
#[tauri::command]
pub fn check_provider_limits(
    state: State<'_, AppState>,
    provider_id: String,
    app_type: String,
) -> Result<crate::cc_switch::services::usage_stats::ProviderLimitStatus, AppError> {
    state.db.check_provider_limits(&provider_id, &app_type)
}

/// 删除模型定价
#[tauri::command]
pub fn delete_model_pricing(state: State<'_, AppState>, model_id: String) -> Result<(), AppError> {
    let db = state.db.clone();
    let conn = crate::cc_switch::database::lock_conn!(db.conn);

    conn.execute(
        "DELETE FROM model_pricing WHERE model_id = ?1",
        rusqlite::params![model_id],
    )
    .map_err(|e| AppError::Database(format!("删除模型定价失败: {e}")))?;

    log::info!("已删除模型定价: {model_id}");
    Ok(())
}

/// 模型定价信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPricingInfo {
    pub model_id: String,
    pub display_name: String,
    pub input_cost_per_million: String,
    pub output_cost_per_million: String,
    pub cache_read_cost_per_million: String,
    pub cache_creation_cost_per_million: String,
}

#[cfg(test)]
mod tests {
    use super::csv_escape;

    #[test]
    fn test_csv_escape() {
        assert_eq!(csv_escape("plain"), "plain");
        assert_eq!(csv_escape("a,b"), "\"a,b\"");
        assert_eq!(csv_escape("say \"hi\""), "\"say \"\"hi\"\"\"");
        assert_eq!(csv_escape("line\nbreak"), "\"line\nbreak\"");
    }
}

