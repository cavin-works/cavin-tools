import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface QueueOperation {
  id: string;
  type: 'compress' | 'speed' | 'extract_frames' | 'trim' | 'to_gif';
  name: string;
  params: any;
}

interface OperationResult {
  operationId: string;
  outputPath: string;
  success: boolean;
  error?: string;
}

interface QueueContextType {
  queue: QueueOperation[];
  isProcessing: boolean;
  results: OperationResult[];
  addToQueue: (operation: Omit<QueueOperation, 'id'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  processQueue: (inputPath: string) => Promise<void>;
  clearResults: () => void;
}

const OperationQueueContext = createContext<QueueContextType | undefined>(undefined);

export function OperationQueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<OperationResult[]>([]);

  const addToQueue = useCallback((operation: Omit<QueueOperation, 'id'>) => {
    const newOp: QueueOperation = {
      ...operation,
      id: `${operation.type}-${Date.now()}-${Math.random()}`
    };
    setQueue(prev => [...prev, newOp]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(op => op.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setResults([]);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  const processQueue = useCallback(async (inputPath: string) => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    let currentPath = inputPath;
    const operationResults: OperationResult[] = [];

    for (const operation of queue) {
      try {
        let outputPath: string;

        switch (operation.type) {
          case 'compress':
            outputPath = await invoke<string>('compress_video_command', {
              inputPath: currentPath,
              params: operation.params,
            });
            break;

          case 'speed':
            outputPath = await invoke<string>('change_video_speed', {
              inputPath: currentPath,
              params: operation.params,
            });
            break;

          case 'extract_frames':
            const paths = await invoke<string[]>('extract_frames', {
              inputPath: currentPath,
              params: operation.params,
            });
            // 提取帧操作返回的是多个文件，我们取第一个作为下一个操作的输入（如果需要）
            outputPath = paths[0] || currentPath;
            break;

          case 'trim':
            outputPath = await invoke<string>('trim_video', {
              inputPath: currentPath,
              params: operation.params,
            });
            break;

          case 'to_gif':
            outputPath = await invoke<string>('convert_to_gif', {
              inputPath: currentPath,
              params: operation.params,
            });
            break;

          default:
            throw new Error(`未知的操作类型: ${operation.type}`);
        }

        operationResults.push({
          operationId: operation.id,
          outputPath,
          success: true,
        });

        // 当前操作的输出作为下一个操作的输入
        currentPath = outputPath;

      } catch (error) {
        operationResults.push({
          operationId: operation.id,
          outputPath: currentPath,
          success: false,
          error: String(error),
        });
        // 出错时停止处理
        break;
      }
    }

    setResults(operationResults);
    setIsProcessing(false);
  }, [queue]);

  return (
    <OperationQueueContext.Provider
      value={{
        queue,
        isProcessing,
        results,
        addToQueue,
        removeFromQueue,
        clearQueue,
        processQueue,
        clearResults,
      }}
    >
      {children}
    </OperationQueueContext.Provider>
  );
}

export function useOperationQueue() {
  const context = useContext(OperationQueueContext);
  if (!context) {
    throw new Error('useOperationQueue must be used within OperationQueueProvider');
  }
  return context;
}
