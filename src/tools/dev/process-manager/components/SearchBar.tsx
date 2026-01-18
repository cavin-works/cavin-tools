import React, { useState, KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { useProcessManagerStore } from '../store/processManagerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <Button
          onClick={() => setSearchType('process')}
          variant={searchType === 'process' ? 'default' : 'secondary'}
        >
          搜索进程
        </Button>
        <Button
          onClick={() => setSearchType('port')}
          variant={searchType === 'port' ? 'default' : 'secondary'}
        >
          查询端口
        </Button>
      </div>

      {/* 搜索栏 */}
      {searchType === 'process' ? (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入进程名称 (如: node, chrome)"
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSearchProcess}
            disabled={isLoading || !processName.trim()}
          >
            {isLoading ? '搜索中...' : '搜索'}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="number"
              value={portNumber}
              onChange={(e) => setPortNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入端口号 (如: 3000, 8080)"
              min="1"
              max="65535"
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleQueryPort}
            disabled={isLoading || !portNumber}
          >
            {isLoading ? '查询中...' : '查询'}
          </Button>
        </div>
      )}
    </div>
  );
};
