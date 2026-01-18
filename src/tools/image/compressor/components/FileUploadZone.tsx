import { Upload, FileArchive } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback } from 'react';
import { themeColors } from '@/core/theme/themeConfig';

interface FileUploadZoneProps {
  onFilesSelected: (paths: string[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFilesSelected, disabled }: FileUploadZoneProps) {
  const handleSelectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'ico']
        }]
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        onFilesSelected(paths);
      }
    } catch (error) {
      console.log('文件选择被取消');
    }
  }, [onFilesSelected]);

  return (
    <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 hover:border-neutral-400 dark:hover:border-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 bg-white dark:bg-neutral-800">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${themeColors.primary.bg} flex items-center justify-center flex-shrink-0`}>
          <FileArchive className="w-6 h-6 text-white dark:text-neutral-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-neutral-900 dark:text-neutral-200 text-sm font-semibold mb-1">
            拖拽图片文件到此处，或点击按钮选择
          </p>
          <p className="text-neutral-500 dark:text-neutral-500 text-xs">
            支持所有常见图片格式，保持原格式压缩
          </p>
        </div>
        <button
          onClick={handleSelectFiles}
          disabled={disabled}
          className={themeColors.button.primary + " inline-flex items-center gap-2 px-4 py-2 text-sm font-medium flex-shrink-0"}
        >
          <Upload className="w-4 h-4" />
          选择文件
        </button>
      </div>
    </div>
  );
}
