import { useRef } from 'react';
import { Plus, Download } from 'lucide-react';
import { PageLayout } from '@ai-assistant/components/shared/PageLayout';
import UnifiedMcpPanel from '@ai-assistant/components/mcp/UnifiedMcpPanel';
import { Button } from '@/components/ui/button';

/**
 * MCP 服务器管理页面
 *
 * 独立的 MCP 服务器管理工具页面
 */
export default function McpPage() {
  const mcpPanelRef = useRef<any>(null);

  return (
    <PageLayout
      className="!pt-4"
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mcpPanelRef.current?.openImport()}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            导入配置
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => mcpPanelRef.current?.openAdd()}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            添加服务器
          </Button>
        </>
      }
    >
      <UnifiedMcpPanel
        ref={mcpPanelRef}
        onOpenChange={() => {}}
      />
    </PageLayout>
  );
}
