import { useOperationQueue } from '../contexts/OperationQueueContext';
import { useVideoStore } from '../store/videoStore';
import { X, Play, Trash2, FolderOpen, CheckCircle2, XCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';

export function OperationQueuePanel() {
  const {
    queue,
    isProcessing,
    results,
    removeFromQueue,
    clearQueue,
    processQueue,
    clearResults,
  } = useOperationQueue();
  const { currentVideo } = useVideoStore();

  const handleProcessQueue = async () => {
    if (!currentVideo) return;
    await processQueue(currentVideo.path);
  };

  const handleOpenFolder = (outputPath: string) => {
    // 使用 path.posix 或 path.win32 来处理不同平台的路径分隔符
    const separator = outputPath.includes('\\') ? '\\' : '/';
    const folderPath = outputPath.substring(0, outputPath.lastIndexOf(separator));
    open(folderPath);
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">操作队列</h3>
        <div className="flex gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>
      </div>

      {/* 队列列表 */}
      {queue.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">队列为空</p>
          <p className="text-xs mt-1">从下方功能面板添加操作到队列</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {queue.map((operation, index) => (
            <div
              key={operation.id}
              className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-black dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {operation.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {operation.type === 'compress' && '压缩视频'}
                  {operation.type === 'speed' && `变速 ${operation.params.speed}x`}
                  {operation.type === 'trim' && '截断视频'}
                  {operation.type === 'to_gif' && '转GIF'}
                  {operation.type === 'extract_frames' && '提取帧'}
                </p>
              </div>
              <button
                onClick={() => removeFromQueue(operation.id)}
                disabled={isProcessing}
                className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 执行按钮 */}
      {queue.length > 0 && (
        <button
          onClick={handleProcessQueue}
          disabled={isProcessing || !currentVideo}
          className="w-full bg-black dark:bg-neutral-100 text-white dark:text-neutral-900 py-2 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed disabled:text-neutral-500 dark:disabled:text-neutral-400 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white dark:border-neutral-900 border-t-transparent rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              执行队列 ({queue.length} 个操作)
            </>
          )}
        </button>
      )}

      {/* 执行结果 */}
      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">执行结果</h4>
            <button
              onClick={clearResults}
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              清除
            </button>
          </div>

          <div className="space-y-2">
            {results.map((result, index) => {
              const operation = queue.find(op => op.id === result.operationId);
              const isLastOperation = index === results.length - 1;
              return (
                <div
                  key={result.operationId}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {operation?.name || `操作 ${index + 1}`}
                        {!isLastOperation && result.success && (
                          <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">(临时处理)</span>
                        )}
                      </p>
                      {result.success && isLastOperation ? (
                        <>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 break-all mt-1">
                            {result.outputPath}
                          </p>
                          <button
                            onClick={() => handleOpenFolder(result.outputPath)}
                            className="mt-2 text-xs text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1"
                          >
                            <FolderOpen className="w-3 h-3" />
                            打开文件夹
                          </button>
                        </>
                      ) : result.success ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          已处理 ✓
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 全部完成提示 */}
          {results.every(r => r.success) && (
            <div className="mt-3 p-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                🎉 所有操作执行完成！
              </p>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                最终输出文件已准备好，点击"打开文件夹"查看
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
