import { NextRequest, NextResponse } from 'next/server';
import * as videoRepository from '@/repositories/VideoRepository';
import * as streamingService from '@/services/VideoStreamingService';
import type { VideoStreamUrlsResponse, VideoErrorResponse } from '@/types/api/video-streaming';

interface RouteParams {
  params: {
    cloudflare_video_id: string;
  };
}

/**
 * GET /api/videos/[cloudflare_video_id]/stream - Get streaming URLs
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

    // Validate streaming configuration
    streamingService.validateStreamingConfig();

    // Check if video exists and is ready
    const video = await videoRepository.getVideoForStreaming(cloudflare_video_id);

    if (!video) {
      const errorResponse: VideoErrorResponse = {
        error: 'NOT_FOUND',
        message: 'Video not found or not ready for streaming',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Generate streaming URLs
    const streamingUrls = streamingService.getVideoStreamingUrls(cloudflare_video_id);

    const response: VideoStreamUrlsResponse = streamingUrls;

    return NextResponse.json(response);

  } catch (error) {
    const errorResponse: VideoErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get streaming URLs',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
