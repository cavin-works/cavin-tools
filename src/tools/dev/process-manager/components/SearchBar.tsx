import React, { useState, KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { useProcessManagerStore } from '../store/processManagerStore';

interface SearchBarProps {
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ className = '' }) => {
  const [processName, setProcessName] = useState('');
  const [portNumber, setPortNumber] = useState('');
  const [searchType, setSearchType] = useState<'process' | 'port'>('process');

  const { searchProcesses, queryPort, isLoading, setError } = useProcessManagerStore();

  const handleSearchProcess = async () => {
    if (!processName.trim()) {
      setError('请输入进程名称');
      return;
    }
    await searchProcesses(processName);
  };

  const handleQueryPort = async () => {
    const port = parseInt(portNumber, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError('请输入有效的端口号 (1-65535)');
      return;
    }
    await queryPort(port);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchType === 'process') {
        handleSearchProcess();
      } else {
        handleQueryPort();
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 搜索类型切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchType('process')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchType === 'process'
              ? 'bg-blue-500 text-white dark:bg-blue-600'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          搜索进程
        </button>
        <button
          onClick={() => setSearchType('port')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchType === 'port'
              ? 'bg-blue-500 text-white dark:bg-blue-600'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          查询端口
        </button>
      </div>

      {/* 搜索栏 */}
      {searchType === 'process' ? (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入进程名称 (如: node, chrome)"
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSearchProcess}
            disabled={isLoading || !processName.trim()}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? '搜索中...' : '搜索'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="number"
              value={portNumber}
              onChange={(e) => setPortNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入端口号 (如: 3000, 8080)"
              min="1"
              max="65535"
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleQueryPort}
            disabled={isLoading || !portNumber}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? '查询中...' : '查询'}
          </button>
        </div>
      )}
    </div>
  );
};
