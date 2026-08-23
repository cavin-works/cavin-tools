import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';

// 动态检测 Tauri 环境
const isTauri = () => '__TAURI__' in window;

/**
 * 存储设置区
 *
 * ponytail: 应用当前不写入任何缓存目录（视频缩略图为内存 base64，
 * AI 模型/数据库在配置目录 ~/.config/mnemosyne 下，属用户数据不可清理），
 * 故缓存大小恒为 0 B 且不提供清理按钮；接入真实缓存后再挂 get_cache_size/clear_cache。
 */
export function StorageSection() {
  const [cacheDir, setCacheDir] = useState<string>('');

  // 获取缓存目录
  useEffect(() => {
    async function loadCacheDir() {
      if (!isTauri()) {
        setCacheDir('仅在桌面应用中可用');
        return;
      }

      try {
        const { appCacheDir } = await import('@tauri-apps/api/path');
        const dir = await appCacheDir();
        setCacheDir(dir);
      } catch {
        setCacheDir('未知');
      }
    }
    loadCacheDir();
  }, []);

  // 打开缓存目录
  const handleOpenCacheDir = async () => {
    if (!cacheDir || !isTauri()) return;

    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(cacheDir);
    } catch (err) {
      console.error('无法打开目录:', err);
    }
  };

  // TODO: 「自定义存储目录」尚未接线（后端无对应存储项），接入默认导出目录后再恢复该入口

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">存储</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">管理应用的存储空间和缓存</p>
      </div>

      {/* 缓存信息卡片 */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">缓存目录</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono break-all">
              {cacheDir || '加载中...'}
            </p>
          </div>
          <button
            onClick={handleOpenCacheDir}
            disabled={!cacheDir || !isTauri()}
            className="flex-shrink-0 p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="打开目录"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <div>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">缓存大小</span>
            <span className="ml-2 text-sm font-medium text-neutral-900 dark:text-white">0 B</span>
          </div>
        </div>
      </div>
    </div>
  );
}
