/**
 * 图片加载工具
 * 提供图片信息加载功能
 */

import { invoke } from '@tauri-apps/api/core';
import type { ImageInfo } from '../types/image';

/**
 * 加载图片信息
 * @param imagePath 图片文件路径
 * @returns 图片信息
 */
export async function loadImageInfo(imagePath: string): Promise<ImageInfo> {
  try {
    const imageInfo = await invoke<ImageInfo>('load_image', {
      path: imagePath,
    });
    return imageInfo;
  } catch (error) {
    console.error('加载图片信息失败:', error);
    throw new Error(`加载图片失败: ${error}`);
  }
}
