import { useState } from 'react';
import logo from '../../../assets/logo.svg';
import { ExternalLink, RefreshCw, CheckCircle, Github, Heart } from 'lucide-react';
import { checkUpdate } from '@/lib/updateUtils';
import { useAppStore } from '@/core/store/appStore';

const APP_VERSION = '0.1.0';
const BUILD_DATE = '2026-01';
const GITHUB_URL = 'https://github.com/cavin-works/cavin-tools';

// 动态检测 Tauri 环境
const isTauri = () => '__TAURI__' in window;

/**
 * 关于和更新区
 */
export function AboutSection() {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'latest' | 'available'>('idle');
  const { setUpdateAvailable, setShowUpdateDialog } = useAppStore();

  // 检查更新
  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('idle');
    
    try {
      const update = await checkUpdate();
      
      setIsCheckingUpdate(false);
      
      if (update) {
        setUpdateStatus('available');
        setUpdateAvailable(true, update);
        setShowUpdateDialog(true);
      } else {
        setUpdateStatus('latest');
      }
    } catch (err) {
      console.error('检查更新失败:', err);
      setIsCheckingUpdate(false);
      setUpdateStatus('latest');
    }
  };

  // 打开外部链接
  const openExternal = async (url: string) => {
    if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        return;
      } catch (err) {
        console.error('Tauri 打开链接失败:', err);
      }
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">关于</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">版本信息和更新检查</p>
      </div>

      {/* 应用信息卡片 */}
      <div className="p-5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 flex-shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Mnemosyne</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">专业的多媒体处理工具集</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                v{APP_VERSION}
              </span>
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                {BUILD_DATE}
              </span>
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                Tauri + React
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 检查更新 */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white">软件更新</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {updateStatus === 'latest'
                ? '已是最新版本'
                : updateStatus === 'available'
                  ? '有新版本可用'
                  : '检查是否有新版本'}
            </p>
          </div>
          <button
            onClick={handleCheckUpdate}
            disabled={isCheckingUpdate}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              updateStatus === 'latest'
                ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10'
                : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100'
            }`}
          >
            {isCheckingUpdate ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>检查中...</span>
              </>
            ) : updateStatus === 'latest' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>已是最新</span>
              </>
            ) : (
              <span>检查更新</span>
            )}
          </button>
        </div>
      </div>

      {/* 链接区 */}
      <div className="space-y-2">
        <button
          onClick={() => openExternal(GITHUB_URL)}
          className="w-full flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 rounded-xl transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-600 transition-colors">
            <Github className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-sm font-medium text-neutral-900 dark:text-white">GitHub 仓库</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">查看源代码和提交问题</p>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
        </button>

        <button
          onClick={() => openExternal(GITHUB_URL)}
          className="w-full flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 rounded-xl transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-600 transition-colors">
            <Heart className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-sm font-medium text-neutral-900 dark:text-white">支持项目</h4>
            <p className="text-xs text-neutral-400 dark:text-neutral-400">如果觉得有帮助，请给个 Star</p>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
        </button>
      </div>

      {/* 版权信息 */}
      <div className="pt-4 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          © 2024-2026 Mnemosyne
        </p>
      </div>
    </div>
  );
}
