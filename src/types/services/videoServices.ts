import type { VideoRecord } from "@/types/repositories/videoRepository";
import type { CloudflareVideoInfo } from "@/types/services/cloudflare";

// Video service interfaces
export interface CreateVideoRequest {
  title: string;
  description?: string;
  uploadLength: number;
  tusResumable: string;
  chapters: string;
}

export interface VideoWithCloudflareInfo extends VideoRecord {
  cloudflareInfo?: CloudflareVideoInfo;
}
