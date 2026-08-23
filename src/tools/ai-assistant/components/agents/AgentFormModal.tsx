import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MarkdownEditor from "@ai-assistant/components/MarkdownEditor";
import {
  buildAgentMarkdown,
  deriveFilename,
} from "@ai-assistant/components/agents/agentMarkdown";

interface AgentFormModalProps {
  /** 编辑模式的文件名（含 .md），缺省为新建模式 */
  filename?: string;
  /** 编辑模式的完整文件内容（父组件读取后传入） */
  initialContent?: string;
  onSave: (filename: string, content: string) => Promise<void>;
  onClose: () => void;
}

const AgentFormModal: React.FC<AgentFormModalProps> = ({
  filename,
  initialContent,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const isEdit = Boolean(filename);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tools, setTools] = useState("");
  const [model, setModel] = useState("");
  const [content, setContent] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const canSave = isEdit || (name.trim() !== "" && description.trim() !== "");

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEdit) {
        await onSave(filename!, content);
      } else {
        await onSave(
          deriveFilename(name),
          buildAgentMarkdown(name, description, tools, model, content),
        );
      }
      onClose();
    } catch {
      // 错误已由父组件 toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("agents.editTitle", { name: filename })
              : t("agents.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4">
          {isEdit ? (
            <>
              <div className="text-xs text-muted-foreground font-mono">
                {filename}
              </div>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder={t("agents.fileContentPlaceholder")}
                darkMode={isDarkMode}
                minHeight="380px"
              />
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="agent-name">{t("agents.name")}</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("agents.namePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="agent-description">
                  {t("agents.description")}
                </Label>
                <Input
                  id="agent-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("agents.descriptionPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agent-model">{t("agents.model")}</Label>
                  <Input
                    id="agent-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={t("agents.modelPlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="agent-tools">{t("agents.tools")}</Label>
                  <Input
                    id="agent-tools"
                    value={tools}
                    onChange={(e) => setTools(e.target.value)}
                    placeholder={t("agents.toolsPlaceholder")}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="agent-prompt" className="mb-2 block">
                  {t("agents.systemPrompt")}
                </Label>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder={t("agents.systemPromptPlaceholder")}
                  darkMode={isDarkMode}
                  minHeight="240px"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentFormModal;
