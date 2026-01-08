export const VALID_VIDEO_EXTENSIONS = [
  '.mp4', '.mov', '.avi', '.wmv', '.mkv', '.flv', '.webm', '.m4v'
];

export function isValidVideoFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return VALID_VIDEO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
