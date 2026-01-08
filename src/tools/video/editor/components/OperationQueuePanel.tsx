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
    const folderPath = outputPath.substring(0, outputPath.lastIndexOf('\\'));
    open(folderPath);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">操作队列</h3>
        <div className="flex gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>
      </div>

      {/* 队列列表 */}
      {queue.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">队列为空</p>
          <p className="text-xs mt-1">从下方功能面板添加操作到队列</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {queue.map((operation, index) => (
            <div
              key={operation.id}
              className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg"
            >
              <div className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {operation.name}
                </p>
                <p className="text-xs text-gray-500">
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
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
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
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-500 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-neutral-900">执行结果</h4>
            <button
              onClick={clearResults}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              清除
            </button>
          </div>

          <div className="space-y-2">
            {results.map((result, index) => {
              const operation = queue.find(op => op.id === result.operationId);
              return (
                <div
                  key={result.operationId}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-neutral-50 border-neutral-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">
                        {operation?.name || `操作 ${index + 1}`}
                      </p>
                      {result.success ? (
                        <>
                          <p className="text-xs text-neutral-600 break-all mt-1">
                            {result.outputPath}
                          </p>
                          <button
                            onClick={() => handleOpenFolder(result.outputPath)}
                            className="mt-2 text-xs text-neutral-700 hover:text-black flex items-center gap-1"
                          >
                            <FolderOpen className="w-3 h-3" />
                            打开文件夹
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-red-600 mt-1">
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
            <div className="mt-3 p-3 bg-neutral-100 border border-neutral-300 rounded-lg">
              <p className="text-sm font-medium text-neutral-900">
                🎉 所有操作执行完成！
              </p>
              <p className="text-xs text-neutral-700 mt-1">
                最终输出文件已准备好，点击"打开文件夹"查看
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
