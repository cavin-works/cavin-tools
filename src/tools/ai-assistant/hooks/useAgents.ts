import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { agentsApi, type AgentSummary } from "@ai-assistant/lib/api/agents";

/**
 * 查询所有 Agents（~/.claude/agents/*.md）
 *
 * React Query v5 移除了 useQuery 的 onError，
 * 此处通过 effect 提示错误，避免 list 失败伪装成空目录
 */
export function useAgents() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list(),
  });

  useEffect(() => {
    if (query.error) {
      toast.error(t("agents.loadFailed"), {
        description:
          query.error instanceof Error
            ? query.error.message
            : String(query.error),
      });
    }
  }, [query.error, t]);

  return query;
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
