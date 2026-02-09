import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { PageLayout } from '@ai-assistant/components/shared/PageLayout';
import PromptPanel from '@ai-assistant/components/prompts/PromptPanel';
import { useAiAssistant } from '@ai-assistant/context/AiAssistantContext';
import { Button } from '@/components/ui/button';

/**
 * AI 提示词管理页面
 *
 * 独立的提示词管理工具页面
 */
export default function PromptsPage() {
  const { activeApp } = useAiAssistant();
  const promptPanelRef = useRef<any>(null);

  return (
    <PageLayout
      className="!pt-4"
      actions={
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => promptPanelRef.current?.openAdd()}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            添加提示词
          </Button>
        </>
      }
    >
      <PromptPanel
        ref={promptPanelRef}
        open={true}
        onOpenChange={() => {}}
        appId={activeApp}
      />
    </PageLayout>
  );
}
