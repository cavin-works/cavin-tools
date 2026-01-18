import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ThemeSection } from './components/ThemeSection';
import { GeneralSection } from './components/GeneralSection';
import { StorageSection } from './components/StorageSection';
import { AboutSection } from './components/AboutSection';

/**
 * 设置页面 - 单页滚动式布局
 */
export function SettingsPage() {
  const { setShowSettings } = useAppStore();

  return (
    <div className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 -ml-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">设置</h1>
        </div>

        {/* 设置分组 */}
        <div className="space-y-10">
          <ThemeSection />
          <Divider />
          <GeneralSection />
          <Divider />
          <StorageSection />
          <Divider />
          <AboutSection />
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-neutral-200 dark:border-neutral-800" />;
}
