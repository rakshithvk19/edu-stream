import { createClient } from '@supabase/supabase-js';


// Video status enum
export type VideoStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'error';

// Video record interface
export interface VideoRecord {
  id?: string;
  title: string;
  description?: string;
  cloudflare_video_id: string;
  playback_id?: string | null;
  duration_sec?: number | null;
  size_bytes?: number | null;
  thumbnail_url?: string | null;
  status: VideoStatus;
  created_at?: string;
  updated_at?: string;
  cloudflare_upload_id?: string | null;
  chapters?: Array<{title: string; timestamp: string; start_seconds: number}> | null; // JSONB array of chapter objects
}

// Create video data interface
export interface CreateVideoData {
  title: string;
  description?: string;
  cloudflare_video_id: string;
  size_bytes: number;
  cloudflare_upload_id: string;
  chapters?: Array<{title: string; timestamp: string; start_seconds: number}>; // JSONB array of chapter objects
}

// Update video data interface
export interface UpdateVideoData {
  status?: VideoStatus;
  playback_id?: string;
  duration_sec?: number;
  size_bytes?: number;
  thumbnail_url?: string;
  updated_at?: string;
}

/**
 * Create Supabase client for database operations
 */
function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { 
      auth: { 
        persistSession: false, 
        autoRefreshToken: false 
      } 
    }
  );
}

/**
 * Insert a new video record
 */
export async function insertVideo(data: CreateVideoData): Promise<VideoRecord> {
  const supabase = createSupabaseClient();
  
  const videoData: Partial<VideoRecord> = {
    title: data.title,
    description: data.description || '',
    cloudflare_video_id: data.cloudflare_video_id,
    playback_id: null,
    duration_sec: null,
    size_bytes: data.size_bytes,
    thumbnail_url: null,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cloudflare_upload_id: data.cloudflare_upload_id,
    chapters: data.chapters || [],
  };

  const { data: video, error } = await supabase
    .from('videos')
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
export async function getVideoByCloudflareId(cloudflareVideoId: string): Promise<VideoRecord | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('cloudflare_video_id', cloudflareVideoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get video: ${error.message}`);
  }

  return data;
}

/**
 * Get video by ID
 */
export async function getVideoById(id: string): Promise<VideoRecord | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
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
    .from('videos')
    .update(updateData)
    .eq('cloudflare_video_id', cloudflareVideoId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update video: ${error.message}`);
  }

  return data;
}

/**
 * Update video status
 */
export async function updateVideoStatus(
  cloudflareVideoId: string, 
  status: VideoStatus
): Promise<void> {
  await updateVideoByCloudflareId(cloudflareVideoId, { status });
}

/**
 * Get all videos with pagination
 */
export async function getVideos(
  page: number = 1, 
  limit: number = 10
): Promise<{ videos: VideoRecord[]; total: number }> {
  const supabase = createSupabaseClient();
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`Failed to get video count: ${countError.message}`);
  }

  // Get videos
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get videos: ${error.message}`);
  }

  return {
    videos: videos || [],
    total: count || 0,
  };
}

/**
 * Delete video by Cloudflare video ID
 */
export async function deleteVideo(cloudflareVideoId: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('cloudflare_video_id', cloudflareVideoId);

  if (error) {
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

/**
 * Get videos by status
 */
export async function getVideosByStatus(status: VideoStatus): Promise<VideoRecord[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get videos by status: ${error.message}`);
  }

  return data || [];
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
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ready');

  let dataQuery = supabase
    .from('videos')
    .select('*')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Add search functionality if query provided
  if (searchQuery && searchQuery.trim().length > 0) {
    const searchTerm = searchQuery.trim();
    countQuery = countQuery.or(`title.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*`);
    dataQuery = dataQuery.or(`title.ilike.*${searchTerm}*,description.ilike.*${searchTerm}*`);
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
export async function getVideoForStreaming(cloudflareVideoId: string): Promise<VideoRecord | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('cloudflare_video_id', cloudflareVideoId)
    .eq('status', 'ready')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get video for streaming: ${error.message}`);
  }

  return data;
}
