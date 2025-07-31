import type { VideoRecord } from '@/repositories/VideoRepository';
import type { VideoStreamingResponse, VideoStreamUrlsResponse } from '@/types/api/video-streaming';

/**
 * Build Cloudflare Stream HLS manifest URL
 */
export function buildCloudflareStreamHlsUrl(cloudflareVideoId: string): string {
  const subdomain = process.env.CLOUDFLARE_SUBDOMAIN;
  
  if (!subdomain) {
    throw new Error('CLOUDFLARE_SUBDOMAIN environment variable is required');
  }

  // Add https:// if not present and remove trailing slash
  let cleanSubdomain = subdomain.trim();
  if (!cleanSubdomain.startsWith('http://') && !cleanSubdomain.startsWith('https://')) {
    cleanSubdomain = `https://${cleanSubdomain}`;
  }
  cleanSubdomain = cleanSubdomain.replace(/\/$/, '');
  
  return `${cleanSubdomain}/${cloudflareVideoId}/manifest/video.m3u8`;
}

/**
 * Build Cloudflare Stream DASH manifest URL
 */
export function buildCloudflareStreamDashUrl(cloudflareVideoId: string): string {
  const subdomain = process.env.CLOUDFLARE_SUBDOMAIN;
  
  if (!subdomain) {
    throw new Error('CLOUDFLARE_SUBDOMAIN environment variable is required');
  }

  // Add https:// if not present and remove trailing slash
  let cleanSubdomain = subdomain.trim();
  if (!cleanSubdomain.startsWith('http://') && !cleanSubdomain.startsWith('https://')) {
    cleanSubdomain = `https://${cleanSubdomain}`;
  }
  cleanSubdomain = cleanSubdomain.replace(/\/$/, '');
  
  return `${cleanSubdomain}/${cloudflareVideoId}/manifest/video.mpd`;
}

/**
 * Build Cloudflare Stream thumbnail URL
 */
export function buildCloudflareStreamThumbnailUrl(cloudflareVideoId: string, time?: number): string {
  const timeParam = time ? `?time=${time}s` : '';
  return `https://videodelivery.net/${cloudflareVideoId}/thumbnails/thumbnail.jpg${timeParam}`;
}

/**
 * Build Cloudflare Stream preview URL
 */
export function buildCloudflareStreamPreviewUrl(cloudflareVideoId: string): string {
  return `https://videodelivery.net/${cloudflareVideoId}/manifests/video.m3u8`;
}

/**
 * Get streaming URLs for a video
 */
export function getVideoStreamingUrls(cloudflareVideoId: string): VideoStreamUrlsResponse {
  return {
    hls: buildCloudflareStreamHlsUrl(cloudflareVideoId),
    dash: buildCloudflareStreamDashUrl(cloudflareVideoId),
    thumbnail: buildCloudflareStreamThumbnailUrl(cloudflareVideoId),
    preview: buildCloudflareStreamPreviewUrl(cloudflareVideoId),
  };
}

/**
 * Get video with streaming URLs
 */
export function getVideoWithStreamingUrls(video: VideoRecord): VideoStreamingResponse {
  const streamingUrls = getVideoStreamingUrls(video.cloudflare_video_id);
  
  return {
    video,
    streamingUrls,
  };
}

/**
 * Validate Cloudflare Stream configuration
 */
export function validateStreamingConfig(): void {
  if (!process.env.CLOUDFLARE_SUBDOMAIN) {
    throw new Error('CLOUDFLARE_SUBDOMAIN environment variable is required for video streaming');
  }
}

/**
 * Extract video ID from Cloudflare Stream URL (utility function)
 */
export function extractVideoIdFromStreamUrl(url: string): string | null {
  const match = url.match(/\/([a-f0-9]{32})\/manifest\//);
  return match ? match[1] : null;
}

/**
 * Check if video is ready for streaming
 */
export function isVideoReadyForStreaming(video: VideoRecord): boolean {
  return video.status === 'ready' && Boolean(video.cloudflare_video_id);
}

/**
 * Format video duration for display
 */
export function formatVideoDuration(durationSec?: number | null): string {
  if (!durationSec || durationSec <= 0) return '--:--';
  
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = Math.floor(durationSec % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format video file size for display
 */
export function formatVideoFileSize(sizeBytes?: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = sizeBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
