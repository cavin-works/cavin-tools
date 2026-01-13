/**
 * 操作队列面板组件
 * 显示已添加的操作队列，支持删除、清空、执行
 */

import { useImageQueue } from '../contexts/ImageOperationQueueContext';
import { Trash2, Play, RotateCw } from 'lucide-react';

export function OperationQueuePanel() {
  const { queue, isProcessing, results, removeFromQueue, clearQueue, processQueue } = useImageQueue();
  const { currentImage } = useImageQueue() as any; // TODO: 从store获取

  const handleProcess = async () => {
    if (!currentImage) return;
    await processQueue(currentImage.path);
  };

  return (
    <div className="w-80 flex flex-col bg-neutral-800 border-l border-neutral-700">
      {/* 标题 */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-700">
        <h2 className="text-sm font-semibold text-white">操作队列</h2>
      </div>

      {/* 队列列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {queue.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">暂无操作</p>
            <p className="text-xs text-neutral-600 mt-1">从左侧选择功能添加操作</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((operation, index) => (
              <div
                key={operation.id}
                className="flex items-center gap-2 p-2 bg-neutral-700 rounded-lg text-sm"
              >
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs text-white font-medium">
                  {index + 1}
                </span>
                <span className="flex-1 truncate text-white">{operation.name}</span>
                <button
                  onClick={() => removeFromQueue(operation.id)}
                  className="flex-shrink-0 p-1 text-neutral-400 hover:text-red-400 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 处理结果 */}
        {results.length > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-600">
            <h3 className="text-xs font-semibold text-neutral-400 mb-2">处理结果</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded text-xs ${
                  result.success
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {result.success ? (
                  <p>✓ 处理成功</p>
                ) : (
                  <p>✗ {result.error}</p>
                )}
                {result.path && (
                  <p className="text-neutral-500 mt-1 truncate">{result.path}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 p-3 border-t border-neutral-700 space-y-2">
        {queue.length > 0 && (
          <>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isProcessing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  执行队列
                </>
              )}
            </button>
            <button
              onClick={clearQueue}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              清空队列
            </button>
          </>
        )}
      </div>
    </div>
  );
}
