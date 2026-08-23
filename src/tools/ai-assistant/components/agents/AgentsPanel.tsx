import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bot, Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "../ConfirmDialog";
import {
  useAgents,
  useDeleteAgent,
  useSaveAgent,
  type AgentSummary,
} from "@ai-assistant/hooks/useAgents";
import { agentsApi } from "@ai-assistant/lib/api/agents";
import { extractErrorMessage } from "@ai-assistant/utils/errorUtils";
import AgentFormModal from "./AgentFormModal";

export function AgentsPanel() {
  const { t } = useTranslation();
  const { data: agents = [], isLoading } = useAgents();
  const saveAgent = useSaveAgent();
  const deleteAgent = useDeleteAgent();

  // null = 新建模式；{ filename, content } = 编辑模式（原文编辑）
  const [editing, setEditing] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AgentSummary | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = async (agent: AgentSummary) => {
    try {
      const content = await agentsApi.read(agent.filename);
      setEditing({ filename: agent.filename, content });
      setFormOpen(true);
    } catch (e) {
      toast.error(extractErrorMessage(e) || t("agents.loadFailed"));
    }
  };

  const handleSave = async (filename: string, content: string) => {
    // 新建模式查重：同名文件自动追加 -2/-3 后缀（stem 已是 sanitize 后的结果）
    let target = filename;
    if (!editing) {
      const taken = new Set(agents.map((a) => a.filename));
      if (taken.has(target)) {
        const stem = filename.replace(/\.md$/, "");
        let n = 2;
        while (taken.has(`${stem}-${n}.md`)) n++;
        target = `${stem}-${n}.md`;
      }
    }

    try {
      await saveAgent.mutateAsync({ filename: target, content });
      toast.success(t("agents.saveSuccess"));
      setFormOpen(false);
    } catch (e) {
      toast.error(extractErrorMessage(e) || t("agents.saveFailed"));
      throw e; // 保持弹窗打开供修正
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteAgent.mutateAsync(confirmDelete.filename);
      toast.success(t("agents.deleteSuccess"));
    } catch (e) {
      toast.error(extractErrorMessage(e) || t("agents.deleteFailed"));
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] px-6">
      <div className="flex-shrink-0 py-4 glass rounded-xl border border-white/10 mb-4 px-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("agents.count", { count: agents.length })}
        </div>
        <Button variant="ghost" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          {t("agents.add")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("agents.loading")}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={<Bot size={24} className="text-muted-foreground" />}
            title={t("agents.empty")}
            description={t("agents.emptyDescription")}
            actionLabel={t("agents.add")}
            onAction={handleAdd}
          />
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.filename}
                className="group rounded-xl border border-border-default bg-muted/50 p-4 transition-all duration-300 hover:bg-muted hover:border-border-default/80 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {agent.name}
                      </h3>
                      {agent.model && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          {agent.model}
                        </Badge>
                      )}
                      {agent.parseError && (
                        <Badge
                          variant="destructive"
                          className="flex-shrink-0"
                        >
                          {t("agents.parseError")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {agent.description || agent.filename}
                    </p>
                    {agent.tools && (
                      <p className="text-xs text-muted-foreground/70 truncate font-mono mt-0.5">
                        {agent.tools}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(agent)}
                      title={t("common.edit")}
                    >
                      <Edit3 size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete(agent)}
                      className="hover:text-red-500 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                      title={t("common.delete")}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <AgentFormModal
          filename={editing?.filename}
          initialContent={editing?.content}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title={t("agents.deleteTitle")}
          message={t("agents.confirmDelete", { name: confirmDelete.name })}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
