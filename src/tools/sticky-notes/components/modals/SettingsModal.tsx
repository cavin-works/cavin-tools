import React, { useEffect, useState } from 'react';
import { X, Keyboard, Monitor, Palette, Check, Pencil } from 'lucide-react';
import { useTodoStore } from '../../store/stickyNotesStore';
import type { WidgetTheme, ThemeColors } from '../../types';
import { WIDGET_THEMES, THEME_LABELS, DEFAULT_CONFIG } from '../../types';
import { isMac } from '@/lib/platform';

interface SettingsModalProps {
  onClose: () => void;
}

const MODIFIER_TOKENS = new Set([
  'commandorcontrol',
  'cmdorctrl',
  'control',
  'ctrl',
  'command',
  'cmd',
  'super',
  'meta',
  'alt',
  'option',
  'shift',
]);

const HOTKEY_LABELS = {
  toggle: '切换显示',
  togglePin: '置顶/取消置顶',
  quickAdd: '快速添加任务',
} as const;

type HotkeyField = keyof typeof HOTKEY_LABELS;

const MODIFIER_ORDER = ['CommandOrControl', 'Alt', 'Shift'] as const;

const normalizeEventKey = (key: string): string | null => {
  if (/^[a-z0-9]$/i.test(key)) {
    return key.toUpperCase();
  }

  if (/^F([1-9]|1[0-2])$/i.test(key)) {
    return key.toUpperCase();
  }

  if (key === ' ') {
    return 'Space';
  }

  return null;
};

const formatShortcutForDisplay = (shortcut: string): string => shortcut
  .split('+')
  .map((segment) => {
    const normalized = segment.trim().toLowerCase();
    switch (normalized) {
      case 'commandorcontrol':
      case 'cmdorctrl':
        return isMac() ? 'Cmd' : 'Ctrl';
      case 'control':
      case 'ctrl':
        return 'Ctrl';
      case 'command':
      case 'cmd':
      case 'super':
      case 'meta':
        return 'Cmd';
      case 'alt':
      case 'option':
        return 'Alt';
      case 'shift':
        return 'Shift';
      case 'space':
        return 'Space';
      default:
        return segment.toUpperCase();
    }
  })
  .join(' + ');

const buildShortcutFromKeyboardEvent = (event: React.KeyboardEvent<HTMLButtonElement>): string | null => {
  const modifiers: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    modifiers.push('CommandOrControl');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }

  const isModifierOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
  if (isModifierOnly) {
    return null;
  }

  const mainKey = normalizeEventKey(event.key);
  if (!mainKey || modifiers.length === 0) {
    return '';
  }

  const orderedModifiers = MODIFIER_ORDER.filter((modifier) => modifiers.includes(modifier));
  return [...orderedModifiers, mainKey].join('+');
};

const normalizeShortcut = (shortcut: string): string => shortcut
  .trim()
  .split('+')
  .map((segment) => segment.trim().toLowerCase())
  .filter(Boolean)
  .map((segment) => {
    switch (segment) {
      case 'cmd':
      case 'command':
      case 'super':
      case 'meta':
        return 'super';
      case 'ctrl':
      case 'control':
        return 'control';
      case 'commandorcontrol':
      case 'cmdorctrl':
        return 'commandorcontrol';
      case 'option':
        return 'alt';
      default:
        return segment;
    }
  })
  .sort()
  .join('+');

const validateShortcut = (shortcut: string): string | null => {
  const tokens = shortcut
    .trim()
    .split('+')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (tokens.length < 2) {
    return '至少需要一个修饰键和一个主按键';
  }

  const modifiers = tokens.filter((token) => MODIFIER_TOKENS.has(token.toLowerCase()));
  const keys = tokens.filter((token) => !MODIFIER_TOKENS.has(token.toLowerCase()));

  if (modifiers.length === 0) {
    return '至少需要一个修饰键，例如 Ctrl、Alt、Shift';
  }

  if (keys.length !== 1) {
    return '必须且只能有一个主按键';
  }

  const mainKey = keys[0];
  if (!/^[a-z0-9]+$/i.test(mainKey) && !/^f([1-9]|1[0-2])$/i.test(mainKey)) {
    return '主按键仅支持字母、数字或 F1-F12';
  }

  return null;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { config, updateConfig } = useTodoStore();

  // 获取 widget 配置，使用默认值作为 fallback
  const widgetConfig = config.widget || DEFAULT_CONFIG.widget;
  const hotkeysConfig = config.hotkeys || DEFAULT_CONFIG.hotkeys;
  const modifierLabel = isMac() ? 'Cmd' : 'Ctrl';
  const [draftHotkeys, setDraftHotkeys] = useState(hotkeysConfig);
  const [editingHotkey, setEditingHotkey] = useState<HotkeyField | null>(null);
  const [toolShortcutConflicts, setToolShortcutConflicts] = useState<Array<{
    id: string;
    name: string;
    shortcut: string;
    normalized: string;
  }>>([]);

  useEffect(() => {
    setDraftHotkeys(hotkeysConfig);
  }, [hotkeysConfig]);

  useEffect(() => {
    setEditingHotkey(null);
  }, [hotkeysConfig]);

  useEffect(() => {
    let active = true;

    const loadToolShortcuts = async () => {
      const module = await import('@/core/tool-registry/toolRegistry');
      if (!active) return;

      setToolShortcutConflicts(
        module
          .getAllTools()
          .filter((tool) => tool.id !== 'sticky-notes' && tool.shortcut)
          .map((tool) => ({
            id: tool.id,
            name: tool.name,
            shortcut: tool.shortcut as string,
            normalized: normalizeShortcut(tool.shortcut as string),
          }))
      );
    };

    void loadToolShortcuts();

    return () => {
      active = false;
    };
  }, []);

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

  const handleHotkeyChange = (key: keyof typeof draftHotkeys, value: string) => {
    setDraftHotkeys((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleHotkeyRecording = (key: HotkeyField, event: React.KeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (event.key === 'Escape') {
      setEditingHotkey(null);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      handleHotkeyChange(key, '');
      setEditingHotkey(null);
      return;
    }

    const shortcut = buildShortcutFromKeyboardEvent(event);
    if (shortcut === null) {
      return;
    }

    if (!shortcut) {
      return;
    }

    handleHotkeyChange(key, shortcut);
    setEditingHotkey(null);
  };

  const handleSaveHotkeys = async () => {
    if (Object.keys(hotkeyErrors).length > 0 || hotkeyConflicts.length > 0) {
      return;
    }

    await updateConfig({
      hotkeys: {
        toggle: draftHotkeys.toggle.trim() || DEFAULT_CONFIG.hotkeys.toggle,
        togglePin: draftHotkeys.togglePin.trim() || DEFAULT_CONFIG.hotkeys.togglePin,
        quickAdd: draftHotkeys.quickAdd.trim() || DEFAULT_CONFIG.hotkeys.quickAdd,
      },
    });
  };

  const handleResetHotkeys = async () => {
    setDraftHotkeys(DEFAULT_CONFIG.hotkeys);
    await updateConfig({
      hotkeys: DEFAULT_CONFIG.hotkeys,
    });
  };

  const hotkeyErrors = (Object.keys(HOTKEY_LABELS) as HotkeyField[]).reduce<Record<string, string>>((acc, key) => {
    const message = validateShortcut(draftHotkeys[key]);
    if (message) {
      acc[key] = message;
    }
    return acc;
  }, {});

  const normalizedHotkeys = (Object.keys(HOTKEY_LABELS) as HotkeyField[]).reduce<Record<string, string>>((acc, key) => {
    acc[key] = normalizeShortcut(draftHotkeys[key]);
    return acc;
  }, {});

  const hotkeyConflicts: string[] = [];
  const seenShortcuts = new Map<string, string>();

  (Object.keys(HOTKEY_LABELS) as HotkeyField[]).forEach((key) => {
    if (hotkeyErrors[key] || !normalizedHotkeys[key]) {
      return;
    }

    const conflictLabel = seenShortcuts.get(normalizedHotkeys[key]);
    if (conflictLabel) {
      hotkeyConflicts.push(`${HOTKEY_LABELS[key]} 与 ${conflictLabel} 使用了相同快捷键`);
      return;
    }

    seenShortcuts.set(normalizedHotkeys[key], HOTKEY_LABELS[key]);

    const toolConflict = toolShortcutConflicts.find((tool) => tool.normalized === normalizedHotkeys[key]);
    if (toolConflict) {
      hotkeyConflicts.push(`${HOTKEY_LABELS[key]} 与工具“${toolConflict.name}”的快捷键 ${toolConflict.shortcut} 冲突`);
    }
  });

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
            <div className="space-y-3">
              <div className="grid gap-2">
                <span className="text-sm text-foreground">切换显示</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHotkey('toggle')}
                    onKeyDown={(event) => handleHotkeyRecording('toggle', event)}
                    onBlur={() => {
                      if (editingHotkey === 'toggle') {
                        setEditingHotkey(null);
                      }
                    }}
                    autoFocus={editingHotkey === 'toggle'}
                    className={`flex-1 px-3 py-2 text-left text-sm bg-muted text-foreground rounded border font-mono transition-colors ${
                      editingHotkey === 'toggle' ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    {editingHotkey === 'toggle'
                      ? '按下快捷键...'
                      : formatShortcutForDisplay(draftHotkeys.toggle || `${modifierLabel}+Alt+T`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHotkey('toggle')}
                    className="p-2 rounded border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="编辑快捷键"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {hotkeyErrors.toggle && (
                  <p className="text-xs text-destructive">{hotkeyErrors.toggle}</p>
                )}
              </div>
              <div className="grid gap-2">
                <span className="text-sm text-foreground">置顶/取消置顶</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHotkey('togglePin')}
                    onKeyDown={(event) => handleHotkeyRecording('togglePin', event)}
                    onBlur={() => {
                      if (editingHotkey === 'togglePin') {
                        setEditingHotkey(null);
                      }
                    }}
                    autoFocus={editingHotkey === 'togglePin'}
                    className={`flex-1 px-3 py-2 text-left text-sm bg-muted text-foreground rounded border font-mono transition-colors ${
                      editingHotkey === 'togglePin' ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    {editingHotkey === 'togglePin'
                      ? '按下快捷键...'
                      : formatShortcutForDisplay(draftHotkeys.togglePin || `${modifierLabel}+Alt+P`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHotkey('togglePin')}
                    className="p-2 rounded border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="编辑快捷键"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {hotkeyErrors.togglePin && (
                  <p className="text-xs text-destructive">{hotkeyErrors.togglePin}</p>
                )}
              </div>
              <div className="grid gap-2">
                <span className="text-sm text-foreground">快速添加任务</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHotkey('quickAdd')}
                    onKeyDown={(event) => handleHotkeyRecording('quickAdd', event)}
                    onBlur={() => {
                      if (editingHotkey === 'quickAdd') {
                        setEditingHotkey(null);
                      }
                    }}
                    autoFocus={editingHotkey === 'quickAdd'}
                    className={`flex-1 px-3 py-2 text-left text-sm bg-muted text-foreground rounded border font-mono transition-colors ${
                      editingHotkey === 'quickAdd' ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    {editingHotkey === 'quickAdd'
                      ? '按下快捷键...'
                      : formatShortcutForDisplay(draftHotkeys.quickAdd || `${modifierLabel}+Alt+N`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHotkey('quickAdd')}
                    className="p-2 rounded border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="编辑快捷键"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {hotkeyErrors.quickAdd && (
                  <p className="text-xs text-destructive">{hotkeyErrors.quickAdd}</p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              点击编辑图标后直接按下组合键。支持字母、数字、F1-F12，`Backspace/Delete` 可清空，`Esc` 取消录制。
            </p>
            {hotkeyConflicts.length > 0 && (
              <div className="mt-2 space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                {hotkeyConflicts.map((conflict) => (
                  <p key={conflict} className="text-xs text-destructive">{conflict}</p>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => void handleResetHotkeys()}
                className="px-3 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                恢复默认
              </button>
              <button
                onClick={() => void handleSaveHotkeys()}
                disabled={Object.keys(hotkeyErrors).length > 0 || hotkeyConflicts.length > 0}
                className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                保存快捷键
              </button>
            </div>
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
