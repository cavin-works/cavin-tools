import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Activity, Network, ChevronDown, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import type { ProcessInfo, PortInfo } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProcessListProps {
  processes: ProcessInfo[];
  title?: string;
}

export const ProcessList: React.FC<ProcessListProps> = ({ processes, title }) => {
  const [expandedPorts, setExpandedPorts] = useState<Record<number, PortInfo[] | undefined>>({});
  const [loadingPorts, setLoadingPorts] = useState<Record<number, boolean>>({});

  const handleViewPorts = async (pid: number) => {
    if (expandedPorts[pid]) {
      setExpandedPorts(prev => {
        const newState = { ...prev };
        delete newState[pid];
        return newState;
      });
      return;
    }

    setLoadingPorts(prev => ({ ...prev, [pid]: true }));
    try {
      const ports = await invoke<PortInfo[]>('get_process_ports', { pid });
      setExpandedPorts(prev => ({ ...prev, [pid]: ports }));
    } catch (error) {
      console.error('获取端口失败:', error);
    } finally {
      setLoadingPorts(prev => ({ ...prev, [pid]: false }));
    }
  };

  const handleKillProcess = async (pid: number, name: string) => {
    if (!confirm(`确定要终止进程 "${name}" (PID: ${pid}) 吗？`)) return;

    try {
      await invoke('kill_process', { pid });
    } catch (error) {
      alert(`终止失败: ${error}`);
    }
  };

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Activity className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">暂无进程数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h2 className="text-xl font-semibold text-foreground">
          {title} <span className="text-sm font-normal text-muted-foreground">({processes.length} 个进程)</span>
        </h2>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 font-semibold text-foreground w-16"></th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">PID</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">进程名称</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">内存使用</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">端口占用</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">类型</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process) => {
              const ports = expandedPorts[process.pid];
              const isLoadingPorts = loadingPorts[process.pid];

              return (
                <React.Fragment key={process.pid}>
                  <tr
                    className="border-b border-border hover:bg-accent transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewPorts(process.pid)}
                        disabled={isLoadingPorts}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="查看/隐藏端口"
                      >
                        {isLoadingPorts ? (
                          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        ) : ports ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-foreground">{process.pid}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">{process.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-muted-foreground">{formatMemory(process.memory)}</span>
                    </td>
                    <td className="py-3 px-4">
                      {ports ? (
                        <span className="text-primary font-medium">{ports.length} 个端口</span>
                      ) : (
                        <span className="text-muted-foreground">点击查看</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={process.is_system ? 'secondary' : 'outline'}>
                        {process.is_system ? '系统' : '用户'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        onClick={() => handleKillProcess(process.pid, process.name)}
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="终止进程"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                  {ports && ports.length > 0 && (
                    <tr>
                      <td colSpan={7} className="bg-muted/30 px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {ports.map((port, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md text-sm"
                            >
                              <Network className="w-3.5 h-3.5 text-primary" />
                              <span className="font-mono text-foreground">{port.port}</span>
                              <span className="text-muted-foreground">({port.protocol})</span>
                            </div>
                          ))}
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
