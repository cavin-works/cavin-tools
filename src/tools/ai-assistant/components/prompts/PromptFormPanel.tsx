import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@ai-assistant/components/ui/button";
import { Input } from "@ai-assistant/components/ui/input";
import { Label } from "@ai-assistant/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@ai-assistant/components/ui/dialog";
import MarkdownEditor from "@ai-assistant/components/MarkdownEditor";
import type { Prompt, AppId } from "@ai-assistant/lib/api";

interface PromptFormPanelProps {
  appId: AppId;
  editingId?: string;
  initialData?: Prompt;
  onSave: (id: string, prompt: Prompt) => Promise<void>;
  onClose: () => void;
}

const PromptFormPanel: React.FC<PromptFormPanelProps> = ({
  appId,
  editingId,
  initialData,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const appName = t(`apps.${appId}`);
  const filenameMap: Record<AppId, string> = {
    claude: "CLAUDE.md",
    codex: "AGENTS.md",
    gemini: "GEMINI.md",
    opencode: "AGENTS.md",
  };
  const filename = filenameMap[appId];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setContent(initialData.content);
    }
  }, [initialData]);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      const id = editingId || `prompt-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const prompt: Prompt = {
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        enabled: initialData?.enabled || false,
        createdAt: initialData?.createdAt || timestamp,
        updatedAt: timestamp,
      };
      await onSave(id, prompt);
      onClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setSaving(false);
    }
  };

  const title = editingId
    ? t("prompts.editTitle", { appName })
    : t("prompts.addTitle", { appName });

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
          <div>
            <Label htmlFor="name">{t("prompts.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("prompts.namePlaceholder")}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description">{t("prompts.description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("prompts.descriptionPlaceholder")}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="content" className="block mb-2">
              {t("prompts.content")}
            </Label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder={t("prompts.contentPlaceholder", { filename })}
              darkMode={isDarkMode}
              minHeight="300px"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptFormPanel;
