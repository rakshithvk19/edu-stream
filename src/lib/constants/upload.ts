// Upload-related constants
export const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB cause Vercel Edge/Serverless functions have a 4.5MB request body limit
export const MAX_DURATION_SECONDS = 3600; // 1 hour

// TUS Protocol constants
export const TUS_VERSION = "1.0.0";
export const TUS_RETRY_DELAYS = [0, 3000, 5000, 10000, 20000];

// Chapter-related constants
export const MAX_CHAPTERS = 20;
export const MIN_CHAPTER_DURATION = 10; // seconds
export const MAX_CHAPTER_TITLE_LENGTH = 80;

// Supported video MIME types
export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo", // AVI
  "video/x-ms-wmv", // WMV
  "video/x-flv", // FLV
  "video/webm",
  "video/3gpp",
  "video/x-matroska", // MKV
] as const;
