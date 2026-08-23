import { create } from 'zustand';
import { DEFAULT_PARAMS } from '../types';
import type { CropRatio, CropRect, EditParams, ExportFormat, ImageInfo } from '../types';

interface ImageEditorStore {
  // 输入图片
  inputPath: string | null;
  imageInfo: ImageInfo | null;
  setInput: (path: string, info: ImageInfo) => void;

  // 编辑参数
  params: EditParams;
  updateParams: (patch: Partial<EditParams>) => void;
  resetFilters: () => void;

  // 裁剪
  cropEnabled: boolean;
  crop: CropRect | null;
  cropRatio: CropRatio;
  setCropEnabled: (enabled: boolean) => void;
  setCrop: (crop: CropRect) => void;
  setCropRatio: (ratio: CropRatio) => void;

  // 预览
  previewUrl: string | null;
  previewLoading: boolean;
  setPreview: (url: string) => void;
  setPreviewLoading: (loading: boolean) => void;

  // 导出
  exporting: boolean;
  exportFormat: ExportFormat;
  exportQuality: number;
  setExporting: (exporting: boolean) => void;
  setExportFormat: (format: ExportFormat) => void;
  setExportQuality: (quality: number) => void;

  // 获取发送给后端的参数
  // includeCrop=false 时不含裁剪（裁剪模式下预览显示完整图片，裁剪框叠加其上）
  getEditParams: (includeCrop: boolean) => EditParams;
}

export const useImageEditorStore = create<ImageEditorStore>((set, get) => ({
  inputPath: null,
  imageInfo: null,
  setInput: (path, info) => set({
    inputPath: path,
    imageInfo: info,
    params: { ...DEFAULT_PARAMS },
    cropEnabled: false,
    crop: null,
    cropRatio: 'free',
    previewUrl: null,
    previewLoading: false,
    exporting: false,
    // 默认导出为原格式（不支持时回退 PNG）
    exportFormat: ['png', 'jpg', 'jpeg', 'webp'].includes(info.format.toLowerCase())
      ? (info.format.toLowerCase() === 'jpeg' ? 'jpg' : info.format.toLowerCase() as ExportFormat)
      : 'png',
    exportQuality: 90,
  }),

  params: { ...DEFAULT_PARAMS },
  updateParams: (patch) => set((state) => ({ params: { ...state.params, ...patch } })),
  resetFilters: () => set((state) => ({
    params: {
      ...state.params,
      brightness: 0,
      contrast: 0,
      hue: 0,
      grayscale: false,
      invert: false,
      blur: 0,
      sharpen: 0,
    },
  })),

  cropEnabled: false,
  crop: null,
  cropRatio: 'free',
  setCropEnabled: (enabled) => set({ cropEnabled: enabled }),
  setCrop: (crop) => set({ crop }),
  setCropRatio: (ratio) => set({ cropRatio: ratio }),

  previewUrl: null,
  previewLoading: false,
  setPreview: (url) => set({ previewUrl: url, previewLoading: false }),
  setPreviewLoading: (loading) => set({ previewLoading: loading }),

  exporting: false,
  exportFormat: 'png',
  exportQuality: 90,
  setExporting: (exporting) => set({ exporting }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setExportQuality: (quality) => set({ exportQuality: quality }),

  getEditParams: (includeCrop) => {
    const state = get();
    return {
      ...state.params,
      crop: includeCrop ? state.crop ?? undefined : undefined,
    };
  },
}));
