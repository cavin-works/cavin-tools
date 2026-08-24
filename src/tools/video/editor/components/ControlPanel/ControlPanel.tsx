import { useState } from 'react';
import { CompressPanel } from './CompressPanel';
import { SpeedPanel } from './SpeedPanel';
import { ExtractPanel } from './ExtractPanel';
import { TrimPanel } from './TrimPanel';
import { GifPanel } from './GifPanel';
import { AudioPanel } from './AudioPanel';
import { OperationQueuePanel } from '../OperationQueuePanel';

type TabType = 'queue' | 'compress' | 'speed' | 'extract' | 'audio' | 'trim' | 'gif';

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('queue');

  const tabs = [
    { id: 'queue' as TabType, label: '队列', icon: '📋' },
    { id: 'compress' as TabType, label: '压缩', icon: '🗜️' },
    { id: 'speed' as TabType, label: '变速', icon: '⚡' },
    { id: 'extract' as TabType, label: '提取帧', icon: '🖼️' },
    { id: 'audio' as TabType, label: '提取音频', icon: '🎵' },
    { id: 'trim' as TabType, label: '截断', icon: '✂️' },
    { id: 'gif' as TabType, label: '转GIF', icon: '🎞️' },
  ];

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h2 className="text-xl font-semibold mb-4 text-foreground">操作面板</h2>

      {/* 标签页 */}
      <div className="flex border-b border-border mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
        {activeTab === 'audio' && <AudioPanel />}
        {activeTab === 'trim' && <TrimPanel />}
        {activeTab === 'gif' && <GifPanel />}
      </div>
    </div>
  );
}
