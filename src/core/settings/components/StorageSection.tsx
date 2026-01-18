import { useState, useEffect } from 'react';
import { FolderOpen, Trash2, RefreshCw } from 'lucide-react';

// 动态检测 Tauri 环境
const isTauri = () => '__TAURI__' in window;

/**
 * 存储设置区
 */
export function StorageSection() {
  const [cacheDir, setCacheDir] = useState<string>('');
  const [cacheSize, setCacheSize] = useState<string>('--');
  const [isClearing, setIsClearing] = useState(false);

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

  // 清理缓存
  const handleClearCache = async () => {
    setIsClearing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCacheSize('0 B');
    setIsClearing(false);
  };

  // 选择自定义目录
  const handleSelectDir = async () => {
    if (!isTauri()) return;

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择存储目录',
      });
      if (selected) {
        console.log('选择的目录:', selected);
      }
    } catch (err) {
      console.error('选择目录失败:', err);
    }
  };

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
            <span className="ml-2 text-sm font-medium text-neutral-900 dark:text-white">{cacheSize}</span>
          </div>
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isClearing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isClearing ? '清理中...' : '清理缓存'}</span>
          </button>
        </div>
      </div>

      {/* 自定义目录 */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white">自定义存储位置</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">选择文件的默认导出目录</p>
          </div>
          <button
            onClick={handleSelectDir}
            disabled={!isTauri()}
            className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            选择目录
          </button>
        </div>
      </div>
    </div>
  );
}
