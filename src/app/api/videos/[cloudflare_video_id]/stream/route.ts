import { NextRequest, NextResponse } from "next/server";
import { getVideoForStreaming } from "@/repositories/VideoRepository";
import {
  validateStreamingConfig,
  getVideoStreamingUrls,
} from "@/services/VideoStreamingService";
import type { VideoStreamUrlsResponse, VideoErrorResponse } from "@/types";

/**
 * GET /api/videos/[cloudflare_video_id]/stream - Get streaming URLs
 */
export async function GET(
  request: NextRequest,
  params: Promise<{
    cloudflare_video_id: string;
  }>
) {
  try {
    const { cloudflare_video_id } = await params;

    if (!cloudflare_video_id) {
      const errorResponse: VideoErrorResponse = {
        error: "VALIDATION_ERROR",
        message: "Video ID is required",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate streaming configuration
    validateStreamingConfig();

    // Check if video exists and is ready
    const video = await getVideoForStreaming(cloudflare_video_id);

    if (!video) {
      const errorResponse: VideoErrorResponse = {
        error: "NOT_FOUND",
        message: "Video not found or not ready for streaming",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Generate streaming URLs
    const streamingUrls = getVideoStreamingUrls(cloudflare_video_id);

    const response: VideoStreamUrlsResponse = streamingUrls;

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: VideoErrorResponse = {
      error: "INTERNAL_ERROR",
      message:
        error instanceof Error ? error.message : "Failed to get streaming URLs",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
