import { NextRequest } from "next/server";
import {
  handleTusHeadRequest,
  handleTusPatchRequest,
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
  } catch (_error) {
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
  } catch (_error) {
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to upload chunk" },
      { status: 500 }
    );
  }
}
