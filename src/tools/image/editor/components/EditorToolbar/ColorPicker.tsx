/**
 * 颜色选择器组件
 */

import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

const PRESET_COLORS = [
  '#EF4444', // 红色
  '#F97316', // 橙色
  '#F59E0B', // 黄色
  '#84CC16', // 绿色
  '#06B6D4', // 青色
  '#3B82F6', // 蓝色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#000000', // 黑色
  '#FFFFFF', // 白色
];

export function ColorPicker() {
  const { toolSettings, updateToolSettings } = useEditorStore();
  const [showPicker, setShowPicker] = useState(false);

  const handleColorSelect = (color: string) => {
    updateToolSettings({ color });
    setShowPicker(false);
  };

  return (
    <div className="relative">
      {/* 当前颜色按钮 */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="w-10 h-10 rounded-lg border-2 border-neutral-600 hover:border-neutral-500 transition-all overflow-hidden"
        style={{ backgroundColor: toolSettings.color }}
        title="选择颜色"
      />

      {/* 颜色选择器弹窗 */}
      {showPicker && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />

          {/* 颜色面板 */}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50 bg-neutral-800 rounded-lg shadow-2xl border border-neutral-700 p-3">
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-8 h-8 rounded-md border-2 transition-all hover:scale-110
                    ${
                      toolSettings.color === color
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-neutral-600 hover:border-neutral-500'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* 自定义颜色输入 */}
            <div className="mt-3 pt-3 border-t border-neutral-700">
              <label className="text-xs text-neutral-400 block mb-1">
                自定义颜色
              </label>
              <input
                type="color"
                value={toolSettings.color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
