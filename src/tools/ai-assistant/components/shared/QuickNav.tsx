import { useAppStore } from '@/core/store/appStore';
import { Button } from '@/components/ui/button';
import { Bot, Wrench, Book, Activity } from 'lucide-react';

/**
 * AI 工具定义
 */
const AI_TOOLS = [
  { id: 'ai-providers', name: '供应商', icon: Bot },
  { id: 'ai-skills', name: '技能', icon: Wrench },
  { id: 'ai-prompts', name: '提示词', icon: Book },
  { id: 'ai-mcp', name: 'MCP', icon: Activity },
] as const;

/**
 * AI 工具快捷导航组件
 *
 * 在不同的 AI 工具之间快速切换
 */
export function QuickNav() {
  const { currentToolId, setCurrentToolId } = useAppStore();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {AI_TOOLS.map(({ id, name, icon: Icon }) => (
        <Button
          key={id}
          variant={currentToolId === id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentToolId(id)}
          className="gap-2"
        >
          <Icon className="w-4 h-4" />
          <span>{name}</span>
        </Button>
      ))}
    </div>
  );
}
