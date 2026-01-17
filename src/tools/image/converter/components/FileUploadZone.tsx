import { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Upload, Image as ImageIcon } from 'lucide-react';

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
          name: '图片文件',
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
    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 hover:border-neutral-900 hover:bg-neutral-50 transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-neutral-700 text-sm font-semibold mb-1">
            拖拽图片文件到此处，或点击按钮选择
          </p>
          <p className="text-neutral-400 text-xs">
            支持 PNG, JPG, WebP, GIF, BMP, TIFF, ICO 格式
          </p>
        </div>
        <button
          onClick={handleSelectFiles}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:text-neutral-500 flex-shrink-0"
        >
          <Upload className="w-4 h-4" />
          选择文件
        </button>
      </div>
    </div>
  );
}
