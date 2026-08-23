import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { DEFAULT_PARAMS } from '../types';
import type { CollageImage, CollageParams, ExportFormat } from '../types';

interface ImageCollageStore {
  // 图片列表（顺序即拼贴顺序）
  images: CollageImage[];
  addImages: (images: Omit<CollageImage, 'id'>[]) => void;
  removeImage: (id: string) => void;
  moveImage: (from: number, to: number) => void;
  clearImages: () => void;

  // 拼贴参数
  params: CollageParams;
  updateParams: (patch: Partial<CollageParams>) => void;

  // 预览
  previewUrl: string | null;
  previewLoading: boolean;
  setPreview: (url: string | null) => void;
  setPreviewLoading: (loading: boolean) => void;

  // 导出
  exporting: boolean;
  exportFormat: ExportFormat;
  exportQuality: number;
  setExporting: (exporting: boolean) => void;
  setExportFormat: (format: ExportFormat) => void;
  setExportQuality: (quality: number) => void;
}

const INITIAL = {
  images: [] as CollageImage[],
  params: { ...DEFAULT_PARAMS },
  previewUrl: null as string | null,
  previewLoading: false,
  exporting: false,
  exportFormat: 'png' as ExportFormat,
  exportQuality: 90,
};

export const useImageCollageStore = create<ImageCollageStore>((set) => ({
  ...INITIAL,

  addImages: (images) =>
    set((state) => ({
      images: [
        ...state.images,
        ...images.map((img) => ({ ...img, id: crypto.randomUUID() })),
      ],
    })),
  removeImage: (id) =>
    set((state) => ({ images: state.images.filter((img) => img.id !== id) })),
  moveImage: (from, to) =>
    set((state) => ({
      images:
        from < 0 || to < 0 || from >= state.images.length || to >= state.images.length
          ? state.images
          : arrayMove(state.images, from, to),
    })),
  clearImages: () => set({ images: [], previewUrl: null, previewLoading: false }),

  updateParams: (patch) => set((state) => ({ params: { ...state.params, ...patch } })),

  setPreview: (url) => set({ previewUrl: url, previewLoading: false }),
  setPreviewLoading: (loading) => set({ previewLoading: loading }),

  setExporting: (exporting) => set({ exporting }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setExportQuality: (quality) => set({ exportQuality: quality }),
}));
