import { ComponentType } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { AiAssistantProvider } from './context/AiAssistantContext';
import { queryClient } from './lib/query';
import { Toaster } from '@/components/ui/sonner';
import './index.css';
import './i18n';

/**
 * 高阶组件：为 AI 助手页面提供必要的 Provider
 */
export function withAiAssistantProviders<P extends object>(
  Component: ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AiAssistantProvider>
            <div className="ai-assistant-root h-full">
              <Component {...props} />
              <Toaster />
            </div>
          </AiAssistantProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}
