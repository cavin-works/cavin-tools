/**
 * 图片操作队列上下文
 * 管理用户的编辑操作队列，支持添加、删除、执行操作
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import type { ImageOperation, ProcessResult } from '../../types/operations';

interface ImageQueueContextType {
  /** 操作队列 */
  queue: ImageOperation[];

  /** 是否正在处理 */
  isProcessing: boolean;

  /** 处理结果 */
  results: ProcessResult[];

  /** 添加操作到队列 */
  addToQueue: (operation: Omit<ImageOperation, 'id'>) => void;

  /** 从队列中删除操作 */
  removeFromQueue: (id: string) => void;

  /** 清空队列 */
  clearQueue: () => void;

  /** 执行队列 */
  processQueue: (inputPath: string) => Promise<void>;

  /** 更新操作参数 */
  updateOperation: (id: string, params: any) => void;
}

const ImageOperationQueueContext = createContext<ImageQueueContextType | null>(null);

export function ImageOperationQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ImageOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);

  /**
   * 添加操作到队列
   */
  const addToQueue = useCallback((operation: Omit<ImageOperation, 'id'>) => {
    const newOperation: ImageOperation = {
      ...operation,
      id: `${operation.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setQueue(prev => [...prev, newOperation]);
  }, []);

  /**
   * 从队列中删除操作
   */
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(op => op.id !== id));
  }, []);

  /**
   * 清空队列
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    setResults([]);
  }, []);

  /**
   * 更新操作参数
   */
  const updateOperation = useCallback((id: string, params: any) => {
    setQueue(prev => prev.map(op =>
      op.id === id ? { ...op, params } : op
    ));
  }, []);

  /**
   * 执行队列
   */
  const processQueue = useCallback(async (inputPath: string) => {
    if (queue.length === 0) {
      console.warn('操作队列为空');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      // TODO: 实现队列执行逻辑
      // 1. 调用后端批量处理命令
      // 2. 显示处理进度
      // 3. 返回结果

      console.log('执行操作队列:', queue);
      console.log('输入路径:', inputPath);

      // 临时实现：直接返回成功
      setResults([{
        success: true,
        path: inputPath
      }]);

    } catch (error) {
      console.error('执行队列失败:', error);
      setResults([{
        success: false,
        error: String(error)
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [queue]);

  const value: ImageQueueContextType = {
    queue,
    isProcessing,
    results,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
    updateOperation,
  };

  return (
    <ImageOperationQueueContext.Provider value={value}>
      {children}
    </ImageOperationQueueContext.Provider>
  );
}

/**
 * 使用操作队列上下文
 */
export function useImageQueue() {
  const context = useContext(ImageOperationQueueContext);

  if (!context) {
    throw new Error('useImageQueue must be used within ImageOperationQueueProvider');
  }

  return context;
}
