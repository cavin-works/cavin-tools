import { useVideoStore } from '../../store/videoStore';
import { themeColors } from '@/core/theme/themeConfig';

export function ProgressBar() {
  const { isProcessing, progress, currentOperation } = useVideoStore();

  if (!isProcessing) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 shadow-lg p-4 z-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentOperation || '处理中...'}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {progress.toFixed(0)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
          <div
            className={themeColors.primary.bg + " h-2 rounded-full transition-all duration-300"}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
