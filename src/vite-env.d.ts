/// <reference types="vite/client" />

interface Window {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}
