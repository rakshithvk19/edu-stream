import { NextRequest, NextResponse } from "next/server";
import { getVideoForStreaming } from "@/repositories/VideoRepository";
import type { VideoDetailsResponse, VideoErrorResponse } from "@/types";

/**
 * GET /api/videos/[cloudflare_video_id] - Get video details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cloudflare_video_id: string }> }
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

    // Get video from database
    const video = await getVideoForStreaming(cloudflare_video_id);

    if (!video) {
      const errorResponse: VideoErrorResponse = {
        error: "NOT_FOUND",
        message: "Video not found or not ready for streaming",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const response: VideoDetailsResponse = {
      video,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: VideoErrorResponse = {
      error: "INTERNAL_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch video details",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
