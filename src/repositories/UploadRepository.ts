import { createClient } from '@supabase/supabase-js';


// Upload session interface
export interface UploadSession {
  cloudflareUrl: string;
  videoId: string;
}

/**
 * Create Supabase client for upload operations
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
 * Get upload session by video ID
 */
export async function getUploadSession(videoId: string): Promise<UploadSession | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('cloudflare_upload_id, cloudflare_video_id')
    .eq('cloudflare_video_id', videoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get upload session: ${error.message}`);
  }

  if (!data.cloudflare_upload_id) {
    throw new Error('Upload session not found or invalid');
  }

  return {
    cloudflareUrl: data.cloudflare_upload_id,
    videoId: data.cloudflare_video_id,
  };
}

/**
 * Update upload progress in database
 */
export async function updateUploadProgress(
  videoId: string,
  bytesUploaded: number,
  totalBytes: number
): Promise<void> {
  const supabase = createSupabaseClient();

  const progress = Math.round((bytesUploaded / totalBytes) * 100);

  const { error } = await supabase
    .from('videos')
    .update({
      // You could add a progress field to track upload progress
      updated_at: new Date().toISOString(),
    })
    .eq('cloudflare_video_id', videoId);

  if (error) {
    throw new Error(`Failed to update upload progress: ${error.message}`);
  }
}

/**
 * Mark upload as completed
 */
export async function markUploadCompleted(videoId: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('videos')
    .update({
      status: 'uploading',
      updated_at: new Date().toISOString(),
    })
    .eq('cloudflare_video_id', videoId);

  if (error) {
    throw new Error(`Failed to mark upload as completed: ${error.message}`);
  }
}

/**
 * Mark upload as failed
 */
export async function markUploadFailed(videoId: string, errorMessage?: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('videos')
    .update({
      status: 'error',
      updated_at: new Date().toISOString(),
      // You could add an error_message field to store the error
    })
    .eq('cloudflare_video_id', videoId);

  if (error) {
    throw new Error(`Failed to mark upload as failed: ${error.message}`);
  }
}

/**
 * Get upload statistics
 */
export async function getUploadStats(): Promise<{
  pending: number;
  uploading: number;
  processing: number;
  ready: number;
  error: number;
  total: number;
}> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('status')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get upload stats: ${error.message}`);
  }

  const stats = {
    pending: 0,
    uploading: 0,
    processing: 0,
    ready: 0,
    error: 0,
    total: data?.length || 0,
  };

  data?.forEach(video => {
    if (stats.hasOwnProperty(video.status)) {
      (stats as any)[video.status]++;
    }
  });

  return stats;
}

/**
 * Clean up old failed uploads (utility function)
 */
export async function cleanupFailedUploads(olderThanHours: number = 24): Promise<number> {
  const supabase = createSupabaseClient();
  const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('videos')
    .delete()
    .eq('status', 'error')
    .lt('updated_at', cutoffTime)
    .select();

  if (error) {
    throw new Error(`Failed to cleanup failed uploads: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get recent upload activity
 */
export async function getRecentUploadActivity(limit: number = 10): Promise<any[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('videos')
    .select('title, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent upload activity: ${error.message}`);
  }

  return data || [];
}
