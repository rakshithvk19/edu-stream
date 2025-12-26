import type { VideoRecord } from "@/types/repositories/videoRepository";

export interface VideoListResponse {
  videos: VideoRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface VideoDetailsResponse {
  video: VideoRecord;
}

export interface VideoStreamUrlsResponse {
  hls: string;
  dash?: string;
  thumbnail: string;
  preview?: string;
}

export interface VideoErrorResponse {
  error: string;
  message: string;
  code?: string;
}

// Search-related types (for future use)
export interface VideoSearchResponse {
  videos: VideoRecord[];
  query: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
