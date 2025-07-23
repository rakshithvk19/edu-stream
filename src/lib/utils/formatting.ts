import { SUPPORTED_VIDEO_TYPES } from '@/lib/constants/upload';

/**
 * Convert form errors to user-friendly format
 */
export function formatFormErrors(errors: Record<string, string>): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  Object.entries(errors).forEach(([field, message]) => {
    // Handle nested field paths (e.g., "file.size" -> "file")
    const rootField = field.split('.')[0];
    formatted[rootField] = message;
  });
  
  return formatted;
}

/**
 * Check if string is a valid video MIME type
 */
export function isValidVideoType(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType as any);
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debounce function for validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
