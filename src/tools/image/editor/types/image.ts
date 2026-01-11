/**
 * 图片信息接口
 */
export interface ImageInfo {
  /** 图片文件路径 */
  path: string;
  /** 文件名 */
  filename: string;
  /** 宽度（像素） */
  width: number;
  /** 高度（像素） */
  height: number;
  /** 图片格式（JPEG, PNG, WebP 等） */
  format: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 色彩空间 */
  colorSpace: 'RGB' | 'RGBA' | 'Gray' | 'RGBA+Gray';
  /** 是否有透明通道 */
  hasAlpha: boolean;
}

/**
 * 图片预览信息（用于 UI 显示）
 */
export interface ImagePreview extends ImageInfo {
  /** 预览图 URL（base64 或 blob URL） */
  previewUrl: string;
}
