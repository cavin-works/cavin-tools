import { invoke } from "@tauri-apps/api/core";

export interface AgentSummary {
  name: string;
  description: string;
  tools?: string | null;
  model?: string | null;
  filename: string;
  updatedAt: number;
  parseError: boolean;
}

export const agentsApi = {
  async list(): Promise<AgentSummary[]> {
    return await invoke("list_agents");
  },

  async read(filename: string): Promise<string> {
    return await invoke("read_agent", { filename });
  },

  async save(filename: string, content: string): Promise<void> {
    return await invoke("save_agent", { filename, content });
  },

  async remove(filename: string): Promise<void> {
    return await invoke("delete_agent", { filename });
  },
};
