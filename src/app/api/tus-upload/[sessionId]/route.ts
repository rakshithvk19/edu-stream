import { NextRequest } from "next/server";
import {
  handleTusHeadRequest,
  handleTusPatchRequest,
  getUploadSession,
  getUploadProgress,
} from "@/services/UploadService";

/**
 * OPTIONS - Handle preflight requests
 * CORS is handled by edge middleware
 */
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}

/**
 * HEAD - Get upload offset for resumable uploads
 */
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const response = await handleTusHeadRequest(sessionId, req);
    return response;
  } catch (error) {
    console.error("TUS HEAD error:", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to get upload status" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Upload file chunk
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const response = await handleTusPatchRequest(sessionId, req);
    return response;
  } catch (error) {
    console.error("TUS PATCH error:", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to upload chunk" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get upload session information (for debugging)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await getUploadSession(sessionId);

    if (!session) {
      return Response.json(
        { error: "NOT_FOUND", message: "Upload session not found" },
        { status: 404 }
      );
    }

    const progress = await getUploadProgress(sessionId);

    return Response.json({
      sessionId,
      videoId: session.videoId,
      status: "active",
      progress,
    });
  } catch (error) {
    console.error("TUS GET error:", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to get session info" },
      { status: 500 }
    );
  }
}
