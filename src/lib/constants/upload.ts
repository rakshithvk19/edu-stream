// Upload-related constants
export const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB

// Supported video MIME types
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo', // AVI
  'video/x-ms-wmv',  // WMV
  'video/x-flv',     // FLV
  'video/webm',
  'video/3gpp',
  'video/x-matroska', // MKV
] as const;
