import { NextRequest, NextResponse } from 'next/server';
import * as videoRepository from '@/repositories/VideoRepository';
import type { VideoDetailsResponse, VideoErrorResponse } from '@/types/api/video-streaming';

interface RouteParams {
  params: {
    cloudflare_video_id: string;
  };
}

/**
 * GET /api/videos/[cloudflare_video_id] - Get video details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { cloudflare_video_id } = await params;

    if (!cloudflare_video_id) {
      const errorResponse: VideoErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Video ID is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get video from database
    const video = await videoRepository.getVideoForStreaming(cloudflare_video_id);

    if (!video) {
      const errorResponse: VideoErrorResponse = {
        error: 'NOT_FOUND',
        message: 'Video not found or not ready for streaming',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const response: VideoDetailsResponse = {
      video,
    };

    return NextResponse.json(response);

  } catch (error) {
    const errorResponse: VideoErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch video details',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
