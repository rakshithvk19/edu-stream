import * as videoDb from '@/repositories/VideoRepository';
import * as cloudflare from '@/services/CloudflareService';
import type { VideoRecord, VideoStatus, CreateVideoData } from '@/repositories/VideoRepository';

// Video service interfaces
export interface CreateVideoRequest {
  title: string;
  description?: string;
  uploadLength: number;
  tusResumable: string;
}

export interface VideoWithCloudflareInfo extends VideoRecord {
  cloudflareInfo?: cloudflare.CloudflareVideoInfo;
}

/**
 * Create a new video with Cloudflare upload session
 */
export async function createVideo(request: CreateVideoRequest): Promise<{
  video: VideoRecord;
  uploadSession: cloudflare.CloudflareUploadSession;
}> {
  // Validate input
  if (!request.title || request.title.trim().length === 0) {
    throw new Error('Video title is required');
  }

  if (request.title.length > 255) {
    throw new Error('Video title must be less than 255 characters');
  }

  if (request.description && request.description.length > 1000) {
    throw new Error('Video description must be less than 1000 characters');
  }

  // Create upload session in Cloudflare
  const uploadSession = await cloudflare.createCloudflareUploadSession({
    title: request.title.trim(),
    description: request.description?.trim(),
    uploadLength: request.uploadLength,
    tusResumable: request.tusResumable,
  });

  // Create video record in database
  const videoData: CreateVideoData = {
    title: request.title.trim(),
    description: request.description?.trim(),
    cloudflare_video_id: uploadSession.streamMediaId,
    size_bytes: request.uploadLength,
    cloudflare_upload_id: uploadSession.uploadUrl,
  };

  const video = await videoDb.insertVideo(videoData);

  return {
    video,
    uploadSession,
  };
}

/**
 * Get video by ID with optional Cloudflare info
 */
export async function getVideo(
  videoId: string, 
  includeCloudflareInfo: boolean = false
): Promise<VideoWithCloudflareInfo | null> {
  const video = await videoDb.getVideoById(videoId);
  
  if (!video) {
    return null;
  }

  if (includeCloudflareInfo) {
    try {
      const cloudflareInfo = await cloudflare.getCloudflareVideoInfo(video.cloudflare_video_id);
      return {
        ...video,
        cloudflareInfo,
      };
    } catch (error) {
      console.warn(`Failed to get Cloudflare info for video ${videoId}:`, error);
      return video;
    }
  }

  return video;
}

/**
 * Get video by Cloudflare video ID
 */
export async function getVideoByCloudflareId(
  cloudflareVideoId: string,
  includeCloudflareInfo: boolean = false
): Promise<VideoWithCloudflareInfo | null> {
  const video = await videoDb.getVideoByCloudflareId(cloudflareVideoId);
  
  if (!video) {
    return null;
  }

  if (includeCloudflareInfo) {
    try {
      const cloudflareInfo = await cloudflare.getCloudflareVideoInfo(cloudflareVideoId);
      return {
        ...video,
        cloudflareInfo,
      };
    } catch (error) {
      console.warn(`Failed to get Cloudflare info for video ${cloudflareVideoId}:`, error);
      return video;
    }
  }

  return video;
}

/**
 * Update video status
 */
export async function updateVideoStatus(
  cloudflareVideoId: string,
  status: VideoStatus
): Promise<VideoRecord> {
  return await videoDb.updateVideoByCloudflareId(cloudflareVideoId, { status });
}

/**
 * Update video with processing results
 */
export async function updateVideoProcessingResults(
  cloudflareVideoId: string,
  updates: {
    status: VideoStatus;
    playbackId?: string;
    durationSec?: number;
    sizeBytes?: number;
    thumbnailUrl?: string;
  }
): Promise<VideoRecord> {
  const updateData = {
    status: updates.status,
    playback_id: updates.playbackId,
    duration_sec: updates.durationSec,
    size_bytes: updates.sizeBytes,
    thumbnail_url: updates.thumbnailUrl,
  };

  return await videoDb.updateVideoByCloudflareId(cloudflareVideoId, updateData);
}

/**
 * Get videos with pagination
 */
export async function getVideos(
  page: number = 1,
  limit: number = 10,
  status?: VideoStatus
): Promise<{
  videos: VideoRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  let videos: VideoRecord[];
  let total: number;

  if (status) {
    videos = await videoDb.getVideosByStatus(status);
    total = videos.length;
    // Apply pagination manually for filtered results
    const startIndex = (page - 1) * limit;
    videos = videos.slice(startIndex, startIndex + limit);
  } else {
    const result = await videoDb.getVideos(page, limit);
    videos = result.videos;
    total = result.total;
  }

  return {
    videos,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Delete video (from both database and Cloudflare)
 */
export async function deleteVideo(cloudflareVideoId: string): Promise<void> {
  // Delete from Cloudflare first
  try {
    await cloudflare.deleteCloudflareVideo(cloudflareVideoId);
  } catch (error) {
    console.warn(`Failed to delete video from Cloudflare: ${error}`);
    // Continue with database deletion even if Cloudflare deletion fails
  }

  // Delete from database
  await videoDb.deleteVideo(cloudflareVideoId);
}

/**
 * Get video streaming URLs
 */
export async function getVideoStreamingUrls(cloudflareVideoId: string): Promise<{
  hls?: string;
  dash?: string;
  thumbnail: string;
  preview: string;
} | null> {
  try {
    const cloudflareInfo = await cloudflare.getCloudflareVideoInfo(cloudflareVideoId);
    
    return {
      hls: cloudflareInfo.playback?.hls,
      dash: cloudflareInfo.playback?.dash,
      thumbnail: cloudflare.getVideoThumbnailUrl(cloudflareVideoId),
      preview: cloudflare.getVideoPreviewUrl(cloudflareVideoId),
    };
  } catch (error) {
    console.error(`Failed to get streaming URLs for video ${cloudflareVideoId}:`, error);
    return null;
  }
}

/**
 * Sync video status with Cloudflare
 */
export async function syncVideoWithCloudflare(cloudflareVideoId: string): Promise<VideoRecord> {
  const cloudflareInfo = await cloudflare.getCloudflareVideoInfo(cloudflareVideoId);
  
  const statusMap: Record<string, VideoStatus> = {
    'pendingupload': 'pending',
    'inprogress': 'processing',
    'ready': 'ready',
    'error': 'error',
  };

  const status = statusMap[cloudflareInfo.status.state] || 'error';
  
  const updates = {
    status,
    playback_id: status === 'ready' ? cloudflareInfo.uid : undefined,
    duration_sec: cloudflareInfo.duration ? Math.round(cloudflareInfo.duration) : undefined,
    size_bytes: cloudflareInfo.size,
    thumbnail_url: status === 'ready' ? cloudflare.getVideoThumbnailUrl(cloudflareInfo.uid) : undefined,
  };

  return await videoDb.updateVideoByCloudflareId(cloudflareVideoId, updates);
}

/**
 * Get video statistics
 */
export async function getVideoStats(): Promise<{
  total: number;
  byStatus: Record<VideoStatus, number>;
  totalSize: number;
  totalDuration: number;
}> {
  const { videos: allVideos } = await videoDb.getVideos(1, 1000); // Get all videos for stats
  
  const stats = {
    total: allVideos.length,
    byStatus: {
      pending: 0,
      uploading: 0,
      processing: 0,
      ready: 0,
      error: 0,
    } as Record<VideoStatus, number>,
    totalSize: 0,
    totalDuration: 0,
  };

  allVideos.forEach(video => {
    stats.byStatus[video.status]++;
    if (video.size_bytes) {
      stats.totalSize += video.size_bytes;
    }
    if (video.duration_sec) {
      stats.totalDuration += video.duration_sec;
    }
  });

  return stats;
}
