import React, { createContext, useContext, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ImageOperation, ProcessResult } from '../types';

interface QueueOperation extends ImageOperation {
  id: string;
}

interface OperationResult {
  operationId: string;
  outputPath: string;
  success: boolean;
  error?: string;
}

interface ImageQueueContextType {
  queue: QueueOperation[];
  isProcessing: boolean;
  results: OperationResult[];
  addToQueue: (operation: Omit<QueueOperation, 'id'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  processQueue: (inputPath: string) => Promise<void>;
  clearResults: () => void;
}

const ImageOperationQueueContext = createContext<ImageQueueContextType | undefined>(undefined);

export function ImageOperationQueueProvider({ children }: { children: React.ReactNode }) {
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
    setResults([]);

    try {
      // 转换队列为后端期望的格式
      const operations = queue.map(op => ({
        type: op.type,
        name: op.name,
        params: op.params,
      }));

      // 调用后端统一处理队列的命令
      const finalOutputPath = await invoke<string>('process_image_operation_queue', {
        inputPath,
        operations,
      });

      // 所有操作都成功完成，记录结果
      const operationResults: OperationResult[] = queue.map((op, index) => ({
        operationId: op.id,
        outputPath: index === queue.length - 1 ? finalOutputPath : '(临时文件)',
        success: true,
      }));

      setResults(operationResults);
    } catch (error) {
      // 处理失败，记录错误
      const operationResults: OperationResult[] = queue.map(op => ({
        operationId: op.id,
        outputPath: '',
        success: false,
        error: String(error),
      }));

      setResults(operationResults);
    } finally {
      setIsProcessing(false);
    }
  }, [queue]);

  return (
    <ImageOperationQueueContext.Provider
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
    </ImageOperationQueueContext.Provider>
  );
}

export function useImageQueue() {
  const context = useContext(ImageOperationQueueContext);
  if (!context) {
    throw new Error('useImageQueue must be used within ImageOperationQueueProvider');
  }
  return context;
}
