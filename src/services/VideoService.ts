import {
  insertVideo,
  updateVideoByCloudflareId,
} from "@/repositories/VideoRepository";
import {
  createCloudflareUploadSession,
} from "@/services/CloudflareService";
import type {
  VideoRecord,
  CreateVideoData,
  CreateVideoRequest,
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
  const uploadSession = await createCloudflareUploadSession({
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
    chapters: processedChapters,
  };

  const video = await insertVideo(videoData);

  return {
    video,
    uploadSession,
  };
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
