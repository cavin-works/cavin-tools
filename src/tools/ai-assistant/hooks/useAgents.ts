import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi, type AgentSummary } from "@ai-assistant/lib/api/agents";

/**
 * 查询所有 Agents（~/.claude/agents/*.md）
 */
export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list(),
  });
}

/**
 * 保存 Agent 文件（新建/编辑共用）
 */
export function useSaveAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filename, content }: { filename: string; content: string }) =>
      agentsApi.save(filename, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

/**
 * 删除 Agent 文件
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => agentsApi.remove(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export type { AgentSummary };
