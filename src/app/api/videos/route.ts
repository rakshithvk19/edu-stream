import { NextRequest, NextResponse } from "next/server";
import { getReadyVideos } from "@/repositories/VideoRepository";
import type { VideoListResponse, VideoErrorResponse } from "@/types";

/**
 * GET /api/videos - List ready videos with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "12", 10))
    ); // Max 50 videos per page
    const searchQuery = searchParams.get("search") || undefined;

    // Get ready videos from database
    const { videos, total } = await getReadyVideos(page, limit, searchQuery);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    const response: VideoListResponse = {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: VideoErrorResponse = {
      error: "INTERNAL_ERROR",
      message:
        error instanceof Error ? error.message : "Failed to fetch videos",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
