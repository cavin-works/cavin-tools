use crate::cc_switch::services::agent::{AgentService, AgentSummary};

#[tauri::command]
pub async fn list_agents() -> Result<Vec<AgentSummary>, String> {
    AgentService::list_agents().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_agent(filename: String) -> Result<String, String> {
    AgentService::read_agent(&filename).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_agent(filename: String, content: String) -> Result<(), String> {
    AgentService::save_agent(&filename, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_agent(filename: String) -> Result<(), String> {
    AgentService::delete_agent(&filename).map_err(|e| e.to_string())
}
