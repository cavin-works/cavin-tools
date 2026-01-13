/**
 * 标签页面板组件
 * 垂直标签页导航，显示不同的编辑功能
 */

import { useState } from 'react';
import { TABS, TabType } from '../types/tabs';
import { CropPanel } from './Panels/CropPanel';
import { RotatePanel } from './Panels/RotatePanel';
import { FlipPanel } from './Panels/FlipPanel';
import { ResizePanel } from './Panels/ResizePanel';
import { WatermarkPanel } from './Panels/WatermarkPanel';
import { MosaicPanel } from './Panels/MosaicPanel';

export function TabPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('crop');

  return (
    <div className="w-80 flex bg-neutral-800 border-r border-neutral-700">
      {/* 垂直标签页导航 */}
      <div className="flex-shrink-0 w-20 py-4 border-r border-neutral-700 flex flex-col gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={`${tab.label}: ${tab.description}`}
            className={`
              relative flex flex-col items-center justify-center py-3 px-2 rounded-lg mx-1 transition-all
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }
            `}
          >
            <span className="text-2xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 功能面板区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'crop' && <CropPanel />}
        {activeTab === 'rotate' && <RotatePanel />}
        {activeTab === 'flip' && <FlipPanel />}
        {activeTab === 'resize' && <ResizePanel />}
        {activeTab === 'watermark' && <WatermarkPanel />}
        {activeTab === 'mosaic' && <MosaicPanel />}
      </div>
    </div>
  );
}
