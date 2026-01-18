import { useAppStore } from '../../store/appStore';

/**
 * 主题设置区
 */
export function ThemeSection() {
  const { theme, setTheme } = useAppStore();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">外观</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">自定义应用的外观和主题</p>
      </div>

      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white">主题模式</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">选择应用的显示主题</p>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
            className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 transition-all cursor-pointer"
          >
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="system">跟随系统</option>
          </select>
        </div>
      </div>
    </div>
  );
}
