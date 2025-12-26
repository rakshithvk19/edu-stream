import { createClient } from "@supabase/supabase-js";
import { UploadSession } from "@/types/repositories/uploadRepository";

/**
 * Create Supabase client for upload operations
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
 * Get upload session by video ID
 */
export async function fetchUploadSession(
  videoId: string
): Promise<UploadSession | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("videos")
    .select("cloudflare_upload_id, cloudflare_video_id")
    .eq("cloudflare_video_id", videoId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get upload session: ${error.message}`);
  }

  if (!data.cloudflare_upload_id) {
    throw new Error("Upload session not found or invalid");
  }

  return {
    cloudflareUrl: data.cloudflare_upload_id,
    videoId: data.cloudflare_video_id,
  };
}

/**
 * Mark upload as completed
 */
export async function markUploadCompleted(videoId: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("videos")
    .update({
      status: "uploading",
      updated_at: new Date().toISOString(),
    })
    .eq("cloudflare_video_id", videoId);

  if (error) {
    throw new Error(`Failed to mark upload as completed: ${error.message}`);
  }
}


