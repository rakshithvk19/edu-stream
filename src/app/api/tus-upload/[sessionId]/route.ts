import { NextRequest } from "next/server";

import * as uploadService from "@/services/UploadService";
import { 
  handleNotFoundError, 
  handleInternalError 
} from "@/lib/middleware/errors";

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
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    const response = await uploadService.handleTusHeadRequest(sessionId, req);
    return response;
    
  } catch (error) {
    console.error("TUS HEAD error:", error);
    return handleInternalError("Failed to get upload status");
  }
}

/**
 * PATCH - Upload file chunk
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    const response = await uploadService.handleTusPatchRequest(sessionId, req);
    return response;
    
  } catch (error) {
    console.error("TUS PATCH error:", error);
    return handleInternalError("Failed to upload chunk");
  }
}

/**
 * GET - Get upload session information (for debugging)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    const session = await uploadService.getUploadSession(sessionId);
    
    if (!session) {
      return handleNotFoundError("Upload session not found");
    }

    const progress = await uploadService.getUploadProgress(sessionId);

    return Response.json({
      sessionId,
      videoId: session.videoId,
      status: "active",
      progress,
    });
    
  } catch (error) {
    console.error("TUS GET error:", error);
    return handleInternalError("Failed to get session info");
  }
}
