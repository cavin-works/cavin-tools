import { useState } from 'react';
import { CompressPanel } from './CompressPanel';
import { SpeedPanel } from './SpeedPanel';
import { ExtractPanel } from './ExtractPanel';
import { TrimPanel } from './TrimPanel';
import { GifPanel } from './GifPanel';
import { OperationQueuePanel } from '../OperationQueuePanel';

type TabType = 'queue' | 'compress' | 'speed' | 'extract' | 'trim' | 'gif';

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('queue');

  const tabs = [
    { id: 'queue' as TabType, label: '队列', icon: '📋' },
    { id: 'compress' as TabType, label: '压缩', icon: '🗜️' },
    { id: 'speed' as TabType, label: '变速', icon: '⚡' },
    { id: 'extract' as TabType, label: '提取帧', icon: '🖼️' },
    { id: 'trim' as TabType, label: '截断', icon: '✂️' },
    { id: 'gif' as TabType, label: '转GIF', icon: '🎞️' },
  ];

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">操作面板</h2>

      {/* 标签页 */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 面板内容 */}
      <div>
        {activeTab === 'queue' && <OperationQueuePanel />}
        {activeTab === 'compress' && <CompressPanel />}
        {activeTab === 'speed' && <SpeedPanel />}
        {activeTab === 'extract' && <ExtractPanel />}
        {activeTab === 'trim' && <TrimPanel />}
        {activeTab === 'gif' && <GifPanel />}
      </div>
    </div>
  );
}
