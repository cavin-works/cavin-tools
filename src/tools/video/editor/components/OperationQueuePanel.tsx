import { useOperationQueue } from '../contexts/OperationQueueContext';
import { useVideoStore } from '../store/videoStore';
import { X, Play, Trash2, FolderOpen, CheckCircle2, XCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">操作队列</h3>
        <div className="flex gap-2">
          {queue.length > 0 && (
            <Button
              onClick={clearQueue}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </Button>
          )}
        </div>
      </div>

      {/* 队列列表 */}
      {queue.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">队列为空</p>
          <p className="text-xs mt-1">从下方功能面板添加操作到队列</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {queue.map((operation, index) => (
            <div
              key={operation.id}
              className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg"
            >
              <Badge variant="default" className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
                {index + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {operation.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {operation.type === 'compress' && '压缩视频'}
                  {operation.type === 'speed' && `变速 ${operation.params.speed}x`}
                  {operation.type === 'trim' && '截断视频'}
                  {operation.type === 'to_gif' && '转GIF'}
                  {operation.type === 'extract_frames' && '提取帧'}
                </p>
              </div>
              <Button
                onClick={() => removeFromQueue(operation.id)}
                disabled={isProcessing}
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 执行按钮 */}
      {queue.length > 0 && (
        <Button
          onClick={handleProcessQueue}
          disabled={isProcessing || !currentVideo}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              执行队列 ({queue.length} 个操作)
            </>
          )}
        </Button>
      )}

      {/* 执行结果 */}
      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">执行结果</h4>
            <Button
              onClick={clearResults}
              variant="ghost"
              size="sm"
            >
              清除
            </Button>
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
                      ? 'bg-muted/50 dark:bg-muted/20'
                      : 'bg-destructive/10 dark:bg-destructive/20 border-destructive'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {operation?.name || `操作 ${index + 1}`}
                        {!isLastOperation && result.success && (
                          <span className="ml-2 text-xs text-muted-foreground">(临时处理)</span>
                        )}
                      </p>
                      {result.success && isLastOperation ? (
                        <>
                          <p className="text-xs text-muted-foreground break-all mt-1">
                            {result.outputPath}
                          </p>
                          <Button
                            onClick={() => handleOpenFolder(result.outputPath)}
                            variant="link"
                            size="sm"
                            className="mt-2 p-0 h-auto flex items-center gap-1"
                          >
                            <FolderOpen className="w-3 h-3" />
                            打开文件夹
                          </Button>
                        </>
                      ) : result.success ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          已处理 ✓
                        </p>
                      ) : (
                        <p className="text-xs text-destructive mt-1">
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
            <div className="mt-3 p-3 bg-muted dark:bg-muted/80 rounded-lg">
              <p className="text-sm font-medium">
                🎉 所有操作执行完成！
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                最终输出文件已准备好，点击"打开文件夹"查看
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
