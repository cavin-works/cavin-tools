import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  version: string;
  body: string;
  date: string;
  current_version: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'installing' | 'complete' | 'error';

export interface DownloadEvent {
  event: 'Started' | 'Progress' | 'Finished' | 'Error';
  data?: {
    content_length?: number;
    downloaded?: number;
    total?: number;
    percentage?: number;
    error?: string;
  };
}

const SKIPPED_VERSION_KEY = 'mnemosyne:skipped-version';

export function getSkippedVersion(): string | null {
  try {
    return localStorage.getItem(SKIPPED_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setSkippedVersion(version: string): void {
  try {
    localStorage.setItem(SKIPPED_VERSION_KEY, version);
  } catch (error) {
    console.error('保存跳过版本失败:', error);
  }
}

export function clearSkippedVersion(): void {
  try {
    localStorage.removeItem(SKIPPED_VERSION_KEY);
  } catch (error) {
    console.error('清除跳过版本失败:', error);
  }
}

export function shouldShowUpdate(version: string): boolean {
  const skipped = getSkippedVersion();
  return skipped !== version;
}

export async function checkUpdate(): Promise<UpdateInfo | null> {
  try {
    const result = await invoke<UpdateInfo | null>('check_update');
    
    if (result && shouldShowUpdate(result.version)) {
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('检查更新失败:', error);
    throw error;
  }
}

export async function downloadAndInstall(): Promise<void> {
  try {
    await invoke('download_and_install_update');
  } catch (error) {
    console.error('下载更新失败:', error);
    throw error;
  }
}
