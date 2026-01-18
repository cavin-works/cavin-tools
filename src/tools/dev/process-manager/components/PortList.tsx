import React from 'react';
import { Network, AlertTriangle } from 'lucide-react';
import type { PortInfo } from '../types';
import { useProcessManagerStore } from '../store/processManagerStore';

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
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          端口 {portNumber || ports[0]?.port} 占用情况
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ({ports.length} 个连接)
          </span>
        </h2>
        <button
          onClick={() => handleKillPort(portNumber || ports[0]?.port)}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? '释放中...' : '释放端口'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">端口</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">协议</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">本地地址</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">远程地址</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">进程</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">状态</th>
            </tr>
          </thead>
          <tbody>
            {ports.map((port, index) => (
              <tr
                key={`${port.port}-${port.protocol}-${port.pid}-${index}`}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="py-3 px-4 text-gray-900 dark:text-white font-mono">
                  {port.port}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
                    {port.protocol}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-mono text-sm">
                  {port.local_address}
                </td>
                <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-mono text-sm">
                  {port.remote_address || '-'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {port.process_name}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        PID: {port.pid}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      port.state === 'LISTENING' || port.state === 'LISTEN'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {port.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ports.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                注意事项
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                释放端口将终止所有占用该端口的进程。请确保这些进程可以安全终止。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
