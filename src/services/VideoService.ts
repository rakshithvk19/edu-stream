import {
  insertVideo,
  getVideoById,
  updateVideoByCloudflareId,
  getVideosByStatus,
  deleteVideo,
  getVideoByCloudflareId,
  getVideos,
} from "@/repositories/VideoRepository";
import {
  createCloudflareUploadSession,
  getCloudflareVideoInfo,
  deleteCloudflareVideo,
  getVideoThumbnailUrl,
  getVideoPreviewUrl,
} from "@/services/CloudflareService";
import type {
  VideoRecord,
  CreateVideoData,
  CreateVideoRequest,
  VideoWithCloudflareInfo,
  CloudflareUploadSession,
  VideoStatus,
} from "@/types";
import { parseChaptersFromText } from "@/lib/utils/chapters";

/**
 * Create a new video with Cloudflare upload session
 */
export async function createVideo(request: CreateVideoRequest): Promise<{
  video: VideoRecord;
  uploadSession: CloudflareUploadSession;
}> {
  console.log("🟢 [VIDEO SERVICE] createVideo called with request:", {
    title: request.title,
    hasDescription: !!request.description,
    uploadLength: request.uploadLength,
    tusResumable: request.tusResumable,
    hasChapters: !!request.chapters
  });
  
  // Validate input
  if (!request.title || request.title.trim().length === 0) {
    throw new Error("Video title is required");
  }

  if (request.title.length > 255) {
    throw new Error("Video title must be less than 255 characters");
  }

  if (request.description && request.description.length > 1000) {
    throw new Error("Video description must be less than 1000 characters");
  }

  // Process chapters if provided
  let processedChapters: Array<{
    title: string;
    timestamp: string;
    start_seconds: number;
  }> = [];
  if (request.chapters && request.chapters.trim()) {
    const { chapters, errors } = parseChaptersFromText(request.chapters);
    if (errors.length > 0) {
      throw new Error(`Invalid chapters: ${errors[0].error}`);
    }
    processedChapters = chapters;
  }

  // Create upload session in Cloudflare
  console.log("🟢 [VIDEO SERVICE] Creating Cloudflare upload session...");
  const uploadSession = await createCloudflareUploadSession({
    title: request.title.trim(),
    description: request.description?.trim(),
    uploadLength: request.uploadLength,
    tusResumable: request.tusResumable,
  });

  console.log("🟢 [VIDEO SERVICE] ✅ Upload session created:", {
    streamMediaId: uploadSession.streamMediaId,
    uploadUrl: uploadSession.uploadUrl
  });
  
  // Create video record in database
  console.log("🟢 [VIDEO SERVICE] Creating video record in database...");
  const videoData: CreateVideoData = {
    title: request.title.trim(),
    description: request.description?.trim(),
    cloudflare_video_id: uploadSession.streamMediaId,
    size_bytes: request.uploadLength,
    cloudflare_upload_id: uploadSession.uploadUrl,
    chapters: processedChapters,
  };

  const video = await insertVideo(videoData);
  
  console.log("🟢 [VIDEO SERVICE] ✅ Video record created:", {
    id: video.id,
    cloudflareVideoId: video.cloudflare_video_id,
    title: video.title,
    status: video.status
  });

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
  const video = await getVideoById(videoId);

  if (!video) {
    return null;
  }

  if (includeCloudflareInfo) {
    try {
      const cloudflareInfo = await getCloudflareVideoInfo(
        video.cloudflare_video_id
      );
      return {
        ...video,
        cloudflareInfo,
      };
    } catch (error) {
      console.warn(
        `Failed to get Cloudflare info for video ${videoId}:`,
        error
      );
      return video;
    }
  }

  return video;
}

/**
 * Get video by Cloudflare video ID
 */
export async function fetchVideoByCloudflareId(
  cloudflareVideoId: string,
  includeCloudflareInfo: boolean = false
): Promise<VideoWithCloudflareInfo | null> {
  const video = await getVideoByCloudflareId(cloudflareVideoId);

  if (!video) {
    return null;
  }

  if (includeCloudflareInfo) {
    try {
      const cloudflareInfo = await getCloudflareVideoInfo(cloudflareVideoId);
      return {
        ...video,
        cloudflareInfo,
      };
    } catch (error) {
      console.warn(
        `Failed to get Cloudflare info for video ${cloudflareVideoId}:`,
        error
      );
      return video;
    }
  }

  return video;
}

/**
 * Update video status
 */
export async function handleVideoStatusUpdate(
  cloudflareVideoId: string,
  status: VideoStatus
): Promise<VideoRecord> {
  return await updateVideoByCloudflareId(cloudflareVideoId, { status });
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

  return await updateVideoByCloudflareId(cloudflareVideoId, updateData);
}

/**
 * Get videos with pagination
 */
export async function fetchVideos(
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
    videos = await getVideosByStatus(status);
    total = videos.length;
    // Apply pagination manually for filtered results
    const startIndex = (page - 1) * limit;
    videos = videos.slice(startIndex, startIndex + limit);
  } else {
    const result = await getVideos(page, limit);
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
export async function handleVideoDelete(
  cloudflareVideoId: string
): Promise<void> {
  // Delete from Cloudflare first
  try {
    await deleteCloudflareVideo(cloudflareVideoId);
  } catch (error) {
    console.warn(`Failed to delete video from Cloudflare: ${error}`);
    // Continue with database deletion even if Cloudflare deletion fails
  }

  // Delete from database
  await deleteVideo(cloudflareVideoId);
}

/**
 * Get video streaming URLs
 */
export async function getVideoStreamingUrls(
  cloudflareVideoId: string
): Promise<{
  hls?: string;
  dash?: string;
  thumbnail: string;
  preview: string;
} | null> {
  try {
    const cloudflareInfo = await getCloudflareVideoInfo(cloudflareVideoId);

    return {
      hls: cloudflareInfo.playback?.hls,
      dash: cloudflareInfo.playback?.dash,
      thumbnail: getVideoThumbnailUrl(cloudflareVideoId),
      preview: getVideoPreviewUrl(cloudflareVideoId),
    };
  } catch (error) {
    console.error(
      `Failed to get streaming URLs for video ${cloudflareVideoId}:`,
      error
    );
    return null;
  }
}

/**
 * Sync video status with Cloudflare
 */
export async function syncVideoWithCloudflare(
  cloudflareVideoId: string
): Promise<VideoRecord> {
  const cloudflareInfo = await getCloudflareVideoInfo(cloudflareVideoId);

  const statusMap: Record<string, VideoStatus> = {
    pendingupload: "pending",
    inprogress: "processing",
    ready: "ready",
    error: "error",
  };

  const status = statusMap[cloudflareInfo.status.state] || "error";

  const updates = {
    status,
    playback_id: status === "ready" ? cloudflareInfo.uid : undefined,
    duration_sec: cloudflareInfo.duration
      ? Math.round(cloudflareInfo.duration)
      : undefined,
    size_bytes: cloudflareInfo.size,
    thumbnail_url:
      status === "ready" ? getVideoThumbnailUrl(cloudflareInfo.uid) : undefined,
  };

  return await updateVideoByCloudflareId(cloudflareVideoId, updates);
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
  const { videos: allVideos } = await getVideos(1, 1000); // Get all videos for stats

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

  allVideos.forEach((video) => {
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
