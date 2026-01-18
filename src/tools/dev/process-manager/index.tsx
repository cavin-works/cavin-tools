import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertCircle, X } from 'lucide-react';
import { useProcessManagerStore } from './store/processManagerStore';
import { SearchBar } from './components/SearchBar';
import { ProcessList } from './components/ProcessList';
import { PortList } from './components/PortList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const ProcessManager: React.FC = () => {
  const {
    viewType,
    processes,
    searchResults,
    portResults,
    isLoading,
    error,
    getProcesses,
    setError,
  } = useProcessManagerStore();

  const [autoRefresh, setAutoRefresh] = useState(false);

  // 初始加载进程列表
  useEffect(() => {
    getProcesses();
  }, [getProcesses]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (viewType === 'all') {
        getProcesses();
      }
    }, 5000); // 每5秒刷新

    return () => clearInterval(interval);
  }, [autoRefresh, viewType, getProcesses]);

  const handleRefresh = () => {
    setError(null);
    getProcesses();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                进程管理器
              </h1>
              <p className="text-sm text-muted-foreground">
                查看和管理系统进程及端口占用
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 自动刷新开关 */}
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'secondary'}
              size="icon"
              title={autoRefresh ? '关闭自动刷新' : '开启自动刷新 (每5秒)'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>

            {/* 刷新按钮 */}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 搜索栏 */}
        <SearchBar />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                错误
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && viewType === 'all' && processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <>
            {viewType === 'all' && (
              <ProcessList processes={processes} title="所有进程" />
            )}

            {viewType === 'search' && (
              <ProcessList processes={searchResults} title="搜索结果" />
            )}

            {viewType === 'port' && portResults.length > 0 && (
              <PortList ports={portResults} portNumber={portResults[0].port} />
            )}
          </>
        )}
      </div>

      {/* 底部统计信息 */}
      {viewType === 'all' && processes.length > 0 && (
        <div className="px-6 py-4 bg-muted border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div className="text-muted-foreground">
                总进程数: <span className="font-semibold text-foreground">{processes.length}</span>
              </div>
              <div className="text-muted-foreground">
                系统进程: <span className="font-semibold text-foreground">
                  {processes.filter(p => p.is_system).length}
                </span>
              </div>
              <div className="text-muted-foreground">
                用户进程: <span className="font-semibold text-foreground">
                  {processes.filter(p => !p.is_system).length}
                </span>
              </div>
            </div>

            {autoRefresh && (
              <div className="text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                自动刷新中
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessManager;
