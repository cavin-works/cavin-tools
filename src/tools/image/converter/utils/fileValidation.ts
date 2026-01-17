export const VALID_IMAGE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.ico'
];

export function isValidImageFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

export function getImageFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext === 'jpg' ? 'jpeg' : ext;
}
