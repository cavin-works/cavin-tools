import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AppId } from '@ai-assistant/lib/api';

interface AiAssistantContextValue {
  /** 当前选中的应用 */
  activeApp: AppId;
  /** 切换应用 */
  setActiveApp: (app: AppId) => void;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

interface AiAssistantProviderProps {
  children: ReactNode;
  /** 初始应用，默认为 claude */
  initialApp?: AppId;
}

/**
 * AI 助手共享状态 Provider
 *
 * 管理跨工具的共享状态，主要是 activeApp
 */
export function AiAssistantProvider({
  children,
  initialApp = 'claude'
}: AiAssistantProviderProps) {
  const [activeApp, setActiveApp] = useState<AppId>(initialApp);

  // 持久化到 localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-assistant:activeApp');
    if (saved && ['claude', 'codex', 'gemini', 'opencode', 'cursor'].includes(saved)) {
      setActiveApp(saved as AppId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ai-assistant:activeApp', activeApp);
  }, [activeApp]);

  return (
    <AiAssistantContext.Provider value={{ activeApp, setActiveApp }}>
      {children}
    </AiAssistantContext.Provider>
  );
}

/**
 * 使用 AI 助手共享状态的 Hook
 */
export function useAiAssistant() {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error('useAiAssistant must be used within AiAssistantProvider');
  }
  return context;
}
