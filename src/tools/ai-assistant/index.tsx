import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { UpdateProvider } from './contexts/UpdateContext';
import { queryClient } from './lib/query';
import { Toaster } from './components/ui/sonner';
import App from './App';
import './index.css';
// Initialize i18n
import './i18n';

/**
 * AI Assistant Tool Entry Point
 * 
 * This component wraps the CC Switch application as a tool
 * in the Cavin Tools toolkit. It follows the parent app's theme.
 */
export default function AIAssistant() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="ai-assistant-theme">
        <UpdateProvider>
          <div className="ai-assistant-root h-full">
            <App />
            <Toaster />
          </div>
        </UpdateProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
