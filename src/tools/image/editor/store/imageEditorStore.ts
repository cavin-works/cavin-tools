import { create } from 'zustand';
import { ANNOTATION_COLORS, DEFAULT_PARAMS } from '../types';
import type {
  Annotation,
  AnnotationKind,
  CropRatio,
  CropRect,
  EditParams,
  ExportFormat,
  ImageInfo,
} from '../types';

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
  clearCrop: () => void;
  setCropRatio: (ratio: CropRatio) => void;

  // 标注（annotationTool 非空 = 标注模式，与裁剪模式互斥）
  annotationTool: AnnotationKind | null;
  annotationColor: string;
  annotationStroke: number;
  setAnnotationTool: (tool: AnnotationKind | null) => void;
  setAnnotationColor: (color: string) => void;
  setAnnotationStroke: (stroke: number) => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (index: number) => void;
  clearAnnotations: () => void;

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
  // includeAnnotations=false 时不含标注（标注模式下由 AnnotationLayer 叠加显示）
  getEditParams: (includeCrop: boolean, includeAnnotations?: boolean) => EditParams;
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
    annotationTool: null,
    annotationColor: ANNOTATION_COLORS[0],
    annotationStroke: 4,
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
      saturation: 0,
      annotations: [],
    },
  })),

  cropEnabled: false,
  crop: null,
  cropRatio: 'free',
  // 开启裁剪时退出标注模式（标注数据保留）
  setCropEnabled: (enabled) => set((state) => ({
    cropEnabled: enabled,
    annotationTool: enabled ? null : state.annotationTool,
  })),
  setCrop: (crop) => set({ crop }),
  clearCrop: () => set({ crop: null }),
  setCropRatio: (ratio) => set({ cropRatio: ratio }),

  annotationTool: null,
  annotationColor: ANNOTATION_COLORS[0],
  annotationStroke: 4,
  // 选择工具（非空）时关闭裁剪模式（裁剪数据保留）
  setAnnotationTool: (tool) => set((state) => ({
    annotationTool: tool,
    cropEnabled: tool === null ? state.cropEnabled : false,
  })),
  setAnnotationColor: (color) => set({ annotationColor: color }),
  setAnnotationStroke: (stroke) => set({ annotationStroke: stroke }),
  addAnnotation: (annotation) => set((state) => ({
    params: { ...state.params, annotations: [...state.params.annotations, annotation] },
  })),
  removeAnnotation: (index) => set((state) => ({
    params: {
      ...state.params,
      annotations: state.params.annotations.filter((_, i) => i !== index),
    },
  })),
  clearAnnotations: () => set((state) => ({ params: { ...state.params, annotations: [] } })),

  previewUrl: null,
  previewLoading: false,
  setPreview: (previewUrl) => set({ previewUrl, previewLoading: false }),
  setPreviewLoading: (loading) => set({ previewLoading: loading }),

  exporting: false,
  exportFormat: 'png',
  exportQuality: 90,
  setExporting: (exporting) => set({ exporting }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setExportQuality: (quality) => set({ exportQuality: quality }),

  getEditParams: (includeCrop, includeAnnotations = true) => {
    const state = get();
    return {
      ...state.params,
      crop: includeCrop ? state.crop ?? undefined : undefined,
      annotations: includeAnnotations ? state.params.annotations : [],
    };
  },
}));
