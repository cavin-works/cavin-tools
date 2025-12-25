import { useState } from 'react';
import { CompressPanel } from './CompressPanel';
import { SpeedPanel } from './SpeedPanel';
import { ExtractPanel } from './ExtractPanel';
import { TrimPanel } from './TrimPanel';
import { GifPanel } from './GifPanel';

type TabType = 'compress' | 'speed' | 'extract' | 'trim' | 'gif';

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('compress');

  const tabs = [
    { id: 'compress' as TabType, label: '压缩', icon: '🗜️' },
    { id: 'speed' as TabType, label: '变速', icon: '⚡' },
    { id: 'extract' as TabType, label: '提取帧', icon: '🖼️' },
    { id: 'trim' as TabType, label: '截断', icon: '✂️' },
    { id: 'gif' as TabType, label: '转GIF', icon: '🎞️' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">操作面板</h2>

      {/* 标签页 */}
      <div className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 面板内容 */}
      <div>
        {activeTab === 'compress' && <CompressPanel />}
        {activeTab === 'speed' && <SpeedPanel />}
        {activeTab === 'extract' && <ExtractPanel />}
        {activeTab === 'trim' && <TrimPanel />}
        {activeTab === 'gif' && <GifPanel />}
      </div>
    </div>
  );
}
