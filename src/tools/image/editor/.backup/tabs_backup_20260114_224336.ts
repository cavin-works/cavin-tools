/**
 * 图片编辑器标签页类型定义
 */

export type TabType = 'crop' | 'rotate' | 'flip' | 'resize' | 'watermark' | 'mosaic';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

export const TABS: TabConfig[] = [
  { id: 'crop', label: '裁剪', icon: '✂️', description: '裁剪图片尺寸' },
  { id: 'rotate', label: '旋转', icon: '🔄', description: '旋转图片角度' },
  { id: 'flip', label: '翻转', icon: '↔️', description: '水平或垂直翻转' },
  { id: 'resize', label: '调整大小', icon: '📐', description: '调整图片尺寸' },
  { id: 'watermark', label: '水印', icon: '🖼️', description: '添加图片/文字水印' },
  { id: 'mosaic', label: '马赛克', icon: '🔲', description: '添加马赛克遮罩' },
];
