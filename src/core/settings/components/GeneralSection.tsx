import { useAppStore } from '../../store/appStore';
import { getAllTools } from '../../tool-registry/toolRegistry';

/**
 * 通用设置区
 */
export function GeneralSection() {
  const { settings, updateSettings } = useAppStore();
  const allTools = getAllTools();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">通用</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">配置应用的基本行为</p>
      </div>

      {/* 默认工具选择 */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white">默认启动工具</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">应用启动时自动打开的工具</p>
          </div>
          <select
            value={settings.defaultTool ?? ''}
            onChange={(e) =>
              updateSettings({ defaultTool: e.target.value || undefined })
            }
            className="px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 transition-all cursor-pointer"
          >
            <option value="">无（显示欢迎页）</option>
            {allTools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
