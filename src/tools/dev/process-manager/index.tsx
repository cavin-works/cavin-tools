import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { useProcessManagerStore } from './store/processManagerStore';
import { SearchBar } from './components/SearchBar';
import { ProcessList } from './components/ProcessList';
import { PortList } from './components/PortList';

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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                进程管理器
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                查看和管理系统进程及端口占用
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 自动刷新开关 */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-500 text-white dark:bg-green-600'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
              title={autoRefresh ? '关闭自动刷新' : '开启自动刷新 (每5秒)'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <SearchBar />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                错误
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && viewType === 'all' && processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
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
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div className="text-gray-600 dark:text-gray-400">
                总进程数: <span className="font-semibold text-gray-900 dark:text-white">{processes.length}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                系统进程: <span className="font-semibold text-gray-900 dark:text-white">
                  {processes.filter(p => p.is_system).length}
                </span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                用户进程: <span className="font-semibold text-gray-900 dark:text-white">
                  {processes.filter(p => !p.is_system).length}
                </span>
              </div>
            </div>

            {autoRefresh && (
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
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
