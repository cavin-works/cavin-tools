import React from 'react';
import { Network, AlertTriangle } from 'lucide-react';
import type { PortInfo } from '../types';
import { useProcessManagerStore } from '../store/processManagerStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PortListProps {
  ports: PortInfo[];
  portNumber?: number;
}

export const PortList: React.FC<PortListProps> = ({ ports, portNumber }) => {
  const { killPort, isLoading } = useProcessManagerStore();

  const handleKillPort = async (port: number) => {
    const confirmed = confirm(`确定要释放端口 ${port} 吗?\n\n这将终止占用该端口的所有进程。`);
    if (!confirmed) return;

    try {
      await killPort(port);
    } catch (err) {
      console.error('释放端口失败:', err);
    }
  };

  if (ports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Network className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">
          端口 {portNumber} 未被占用
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          端口 {portNumber || ports[0]?.port} 占用情况
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({ports.length} 个连接)
          </span>
        </h2>
        <Button
          onClick={() => handleKillPort(portNumber || ports[0]?.port)}
          disabled={isLoading}
          variant="destructive"
        >
          {isLoading ? '释放中...' : '释放端口'}
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 font-semibold text-foreground">端口</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">协议</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">本地地址</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">远程地址</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">进程</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">状态</th>
            </tr>
          </thead>
          <tbody>
            {ports.map((port, index) => (
              <tr
                key={`${port.port}-${port.protocol}-${port.pid}-${index}`}
                className="border-b border-border hover:bg-accent transition-colors"
              >
                <td className="py-3 px-4 text-foreground font-mono">
                  {port.port}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="secondary">
                    {port.protocol}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground font-mono text-sm">
                  {port.local_address}
                </td>
                <td className="py-3 px-4 text-muted-foreground font-mono text-sm">
                  {port.remote_address || '-'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-foreground font-medium">
                        {port.process_name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        PID: {port.pid}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={port.state === 'LISTENING' || port.state === 'LISTEN' ? 'default' : 'secondary'}
                  >
                    {port.state}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ports.length > 0 && (
        <div className="mt-4 p-4 bg-accent border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                注意事项
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                释放端口将终止所有占用该端口的进程。请确保这些进程可以安全终止。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
