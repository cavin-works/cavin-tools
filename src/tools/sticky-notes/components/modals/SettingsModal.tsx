import React from 'react';
import { X, Keyboard, Monitor, Palette, Check } from 'lucide-react';
import { useTodoStore } from '../../store/stickyNotesStore';
import type { WidgetTheme, ThemeColors } from '../../types';
import { WIDGET_THEMES, THEME_LABELS, DEFAULT_CONFIG } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { config, updateConfig } = useTodoStore();

  // 获取 widget 配置，使用默认值作为 fallback
  const widgetConfig = config.widget || DEFAULT_CONFIG.widget;
  const hotkeysConfig = config.hotkeys || DEFAULT_CONFIG.hotkeys;

  const handleThemeChange = (theme: WidgetTheme) => {
    updateConfig({
      widget: { ...widgetConfig, theme },
    });
  };

  const handleCustomColorChange = (key: keyof ThemeColors, value: string) => {
    const currentCustom = widgetConfig.customColors || WIDGET_THEMES.dark;
    updateConfig({
      widget: {
        ...widgetConfig,
        customColors: { ...currentCustom, [key]: value },
      },
    });
  };

  const getThemePreviewStyle = (theme: Exclude<WidgetTheme, 'custom'>): React.CSSProperties => {
    const colors = WIDGET_THEMES[theme];
    return {
      backgroundColor: colors.background,
      borderColor: colors.border,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Todo 设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 外观设置 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Palette className="w-4 h-4 text-muted-foreground" />
              外观主题
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(Object.keys(WIDGET_THEMES) as Array<Exclude<WidgetTheme, 'custom'>>).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    widgetConfig.theme === theme
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  style={getThemePreviewStyle(theme)}
                >
                  {widgetConfig.theme === theme && (
                    <Check
                      className="absolute top-1 right-1 w-4 h-4"
                      style={{ color: WIDGET_THEMES[theme].accent }}
                    />
                  )}
                  <div className="text-center">
                    <div
                      className="w-6 h-6 rounded-full mx-auto mb-1 border"
                      style={{
                        backgroundColor: WIDGET_THEMES[theme].accent,
                        borderColor: WIDGET_THEMES[theme].border,
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: WIDGET_THEMES[theme].text }}
                    >
                      {THEME_LABELS[theme]}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* 自定义主题 */}
            <button
              onClick={() => handleThemeChange('custom')}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                widgetConfig.theme === 'custom'
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">自定义颜色</span>
                {widgetConfig.theme === 'custom' && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </div>
            </button>

            {/* 自定义颜色选择器 */}
            {widgetConfig.theme === 'custom' && (
              <div className="mt-3 p-3 bg-muted rounded-lg space-y-3">
                {[
                  { key: 'background', label: '背景色' },
                  { key: 'text', label: '文字颜色' },
                  { key: 'textSecondary', label: '次要文字' },
                  { key: 'border', label: '边框颜色' },
                  { key: 'accent', label: '强调色' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={(widgetConfig.customColors as ThemeColors)?.[key as keyof ThemeColors] || ''}
                        onChange={(e) => handleCustomColorChange(key as keyof ThemeColors, e.target.value)}
                        className="w-24 px-2 py-1 text-xs bg-background text-foreground rounded border border-border"
                        placeholder="#000000"
                      />
                      <input
                        type="color"
                        value={(widgetConfig.customColors as ThemeColors)?.[key as keyof ThemeColors] || '#000000'}
                        onChange={(e) => handleCustomColorChange(key as keyof ThemeColors, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 小部件设置 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              桌面小部件
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">透明度</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={widgetConfig.opacity}
                    onChange={(e) =>
                      updateConfig({
                        widget: { ...widgetConfig, opacity: parseFloat(e.target.value) },
                      })
                    }
                    className="w-24 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {Math.round(widgetConfig.opacity * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">窗口宽度</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="200"
                    max="600"
                    step="10"
                    value={widgetConfig.width}
                    onChange={(e) =>
                      updateConfig({
                        widget: { ...widgetConfig, width: parseInt(e.target.value) || 320 },
                      })
                    }
                    className="w-20 px-2 py-1 text-sm bg-background text-foreground rounded border border-border text-center"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">窗口高度</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="200"
                    max="800"
                    step="10"
                    value={widgetConfig.height}
                    onChange={(e) =>
                      updateConfig({
                        widget: { ...widgetConfig, height: parseInt(e.target.value) || 400 },
                      })
                    }
                    className="w-20 px-2 py-1 text-sm bg-background text-foreground rounded border border-border text-center"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
              </div>
            </div>
          </div>

          {/* 快捷键 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              快捷键
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm text-foreground">切换显示</span>
                <kbd className="px-2 py-1 text-xs bg-background text-foreground rounded border border-border font-mono">
                  {hotkeysConfig.toggle.replace('CommandOrControl', 'Ctrl')}
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm text-foreground">置顶/取消置顶</span>
                <kbd className="px-2 py-1 text-xs bg-background text-foreground rounded border border-border font-mono">
                  {hotkeysConfig.togglePin.replace('CommandOrControl', 'Ctrl')}
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm text-foreground">快速添加任务</span>
                <kbd className="px-2 py-1 text-xs bg-background text-foreground rounded border border-border font-mono">
                  {hotkeysConfig.quickAdd.replace('CommandOrControl', 'Ctrl')}
                </kbd>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              提示：快捷键可在应用设置中自定义修改
            </p>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
