import { createClient } from "@supabase/supabase-js";

import {
  VideoRecord,
  CreateVideoData,
  UpdateVideoData,
} from "../types/repositories/videoRepository";

/**
 * Create Supabase client for database operations
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is required");
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Insert a new video record
 */
export async function insertVideo(data: CreateVideoData): Promise<VideoRecord> {
  const supabase = createSupabaseClient();

  const videoData: Partial<VideoRecord> = {
    title: data.title,
    description: data.description || "",
    cloudflare_video_id: data.cloudflare_video_id,
    playback_id: null,
    duration_sec: null,
    size_bytes: data.size_bytes,
    thumbnail_url: null,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cloudflare_upload_id: data.cloudflare_upload_id,
    chapters: data.chapters || [],
  };

  const { data: video, error } = await supabase
    .from("videos")
    .insert(videoData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert video: ${error.message}`);
  }

  return video;
}

/**
 * Get video by Cloudflare video ID
 */
export async function getVideoByCloudflareId(
  cloudflareVideoId: string
): Promise<VideoRecord | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("cloudflare_video_id", cloudflareVideoId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get video: ${error.message}`);
  }

  return data;
}

/**
 * Update video by Cloudflare video ID
 */
export async function updateVideoByCloudflareId(
  cloudflareVideoId: string,
  updates: UpdateVideoData
): Promise<VideoRecord> {
  const supabase = createSupabaseClient();

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("videos")
    .update(updateData)
    .eq("cloudflare_video_id", cloudflareVideoId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update video: ${error.message}`);
  }

  return data;
}

/**
 * Get ready videos for the video grid (only videos with status 'ready')
 */
export async function getReadyVideos(
  page: number = 1,
  limit: number = 12,
  searchQuery?: string
): Promise<{ videos: VideoRecord[]; total: number }> {
  const supabase = createSupabaseClient();
  const offset = (page - 1) * limit;

  let countQuery = supabase
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("status", "ready");

  let dataQuery = supabase
    .from("videos")
    .select("*")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Add search functionality if query provided
  if (searchQuery && searchQuery.trim().length > 0) {
    const searchTerm = searchQuery.trim();
    countQuery = countQuery.or(
      `title.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*`
    );
    dataQuery = dataQuery.or(
      `title.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*`
    );
  }

  // Get total count
  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new Error(`Failed to get ready videos count: ${countError.message}`);
  }

  // Get videos with pagination
  const { data: videos, error } = await dataQuery;

  if (error) {
    throw new Error(`Failed to get ready videos: ${error.message}`);
  }

  return {
    videos: videos || [],
    total: count || 0,
  };
}

/**
 * Get video for streaming (single video with validation)
 */
export async function getVideoForStreaming(
  cloudflareVideoId: string
): Promise<VideoRecord | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("cloudflare_video_id", cloudflareVideoId)
    .eq("status", "ready")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get video for streaming: ${error.message}`);
  }

  return data;
}
