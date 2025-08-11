import { VideoStatus } from "../enum";

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
  chapters?: Array<{
    title: string;
    timestamp: string;
    start_seconds: number;
  }> | null; // JSONB array of chapter objects
}

// Create video data interface
export interface CreateVideoData {
  title: string;
  description?: string;
  cloudflare_video_id: string;
  size_bytes: number;
  cloudflare_upload_id: string;
  chapters?: Array<{ title: string; timestamp: string; start_seconds: number }>; // JSONB array of chapter objects
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
