import React, { useState } from 'react';
import { Activity, HardDrive, AlertCircle, Network, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { ProcessInfo, PortInfo } from '../types';
import { useProcessManagerStore } from '../store/processManagerStore';

interface ProcessListProps {
  processes: ProcessInfo[];
  title?: string;
}

export const ProcessList: React.FC<ProcessListProps> = ({ processes, title }) => {
  const { killProcess, queryPortsByPid, isLoading } = useProcessManagerStore();
  const [expandedPorts, setExpandedPorts] = useState<Record<number, PortInfo[]>>({});
  const [loadingPorts, setLoadingPorts] = useState<Record<number, boolean>>({});

  const handleKill = async (pid: number, name: string, isSystem: boolean) => {
    if (isSystem) {
      alert(`警告: ${name} 是系统进程,终止它可能导致系统不稳定!\n\n确定要继续吗?`);
    }

    const confirmed = confirm(`确定要终止进程 "${name}" (PID: ${pid}) 吗?`);
    if (!confirmed) return;

    try {
      await killProcess(pid);
    } catch (err) {
      console.error('终止进程失败:', err);
    }
  };

  const handleViewPorts = async (pid: number) => {
    // 如果已经展开，则收起
    if (expandedPorts[pid]) {
      setExpandedPorts(prev => {
        const newState = { ...prev };
        delete newState[pid];
        return newState;
      });
      return;
    }

    // 查询端口
    setLoadingPorts(prev => ({ ...prev, [pid]: true }));
    try {
      const ports = await queryPortsByPid(pid);
      setExpandedPorts(prev => ({ ...prev, [pid]: ports }));
    } catch (err) {
      console.error('查询端口失败:', err);
      // 不显示错误，因为有些进程确实没有端口
    } finally {
      setLoadingPorts(prev => ({ ...prev, [pid]: false }));
    }
  };

  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <Activity className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">暂无进程数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({processes.length} 个进程)</span>
        </h2>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 w-16"></th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">PID</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">进程名称</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">内存使用</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">端口占用</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">类型</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">操作</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process) => {
              const ports = expandedPorts[process.pid];
              const isLoadingPorts = loadingPorts[process.pid];

              return (
                <React.Fragment key={process.pid}>
                  <tr
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewPorts(process.pid)}
                        disabled={isLoadingPorts}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="查看/隐藏端口"
                      >
                        {isLoadingPorts ? (
                          <Network className="w-4 h-4 text-gray-400 animate-pulse" />
                        ) : ports ? (
                          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-mono">
                      {process.pid}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-900 dark:text-white font-medium">
                          {process.name}
                        </span>
                        {process.is_system && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            系统
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {process.memory_usage !== undefined ? (
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-4 h-4" />
                          <span>{process.memory_usage.toFixed(1)} MB</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewPorts(process.pid)}
                        disabled={isLoadingPorts}
                        className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors group"
                        title="点击查看端口详情"
                      >
                        <Network className="w-4 h-4 text-blue-500" />
                        {ports ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {ports.length}个端口
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400">
                            点击查看
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          process.is_system
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        }`}
                      >
                        {process.is_system ? '系统进程' : '用户进程'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleKill(process.pid, process.name, process.is_system)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                      >
                        终止
                      </button>
                    </td>
                  </tr>

                  {/* 端口展开行 */}
                  {ports && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={7} className="py-4 px-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Network className="w-4 h-4" />
                            <span>占用端口 ({ports.length})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {ports.map((port, index) => (
                              <div
                                key={`${port.port}-${port.protocol}-${index}`}
                                className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {port.port}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                                      {port.protocol}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                      {port.state}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {port.local_address}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
