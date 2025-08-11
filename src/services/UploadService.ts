import {
  fetchUploadSession,
  markUploadCompleted,
  markUploadFailed,
  cleanupFailedUploads,
  getUploadStats,
} from "@/repositories/UploadRepository";
import {
  parseUploadMetadata,
  forwardTusRequest,
} from "@/services/CloudflareService";
import { MAX_FILE_SIZE, TUS_VERSION } from "@/lib/constants/upload";
import type { UploadSession } from "@/types/repositories/uploadRepository";
import type {
  TusHeaders,
  TusMetadata,
  UploadProgress,
} from "@/types/services/upload";

/**
 * Parse TUS headers and validate them
 */
export function parseTusHeaders(headers: Headers): TusHeaders {
  const uploadLength = headers.get("Upload-Length");
  const tusResumable = headers.get("Tus-Resumable");
  const uploadMetadata = headers.get("Upload-Metadata");

  if (!uploadLength) {
    throw new Error("Upload-Length header is required");
  }

  const length = parseInt(uploadLength, 10);
  if (isNaN(length) || length <= 0) {
    throw new Error("Upload-Length must be a positive number");
  }

  if (length > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
    );
  }

  return {
    "upload-length": length,
    "tus-resumable": tusResumable || TUS_VERSION,
    "upload-metadata": uploadMetadata || undefined,
  };
}

/**
 * Parse and validate TUS metadata
 */
export function parseTusMetadata(metadataString?: string): TusMetadata {
  if (!metadataString) {
    throw new Error("Upload metadata is required");
  }

  const metadata = parseUploadMetadata(metadataString);

  // Sanitize user input to prevent XSS
  const sanitizeString = (str: string) => {
    return str
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "&": "&amp;",
        };
        return entities[char] || char;
      })
      .trim();
  };

  const result: TusMetadata = {
    name: sanitizeString(
      metadata.name || metadata.filename || "Untitled Video"
    ),
    filename: metadata.filename,
    filetype: metadata.filetype,
    description: metadata.description
      ? sanitizeString(metadata.description)
      : undefined,
    chapters: metadata.chapters || "",
  };

  // Validate required fields
  if (!result.name || result.name.trim().length === 0) {
    throw new Error("Video name is required in metadata");
  }

  // Validate lengths
  if (result.name.length > 255) {
    throw new Error("Video name must be less than 255 characters");
  }

  if (result.description && result.description.length > 1000) {
    throw new Error("Video description must be less than 1000 characters");
  }

  return result;
}

/**
 * Get upload session for TUS continuation
 */
export async function getUploadSession(
  sessionId: string
): Promise<UploadSession | null> {
  try {
    return await fetchUploadSession(sessionId);
  } catch (error) {
    console.error(`Failed to get upload session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Forward TUS HEAD request to get upload offset
 */
export async function handleTusHeadRequest(
  sessionId: string,
  request: Request
): Promise<Response> {
  const session = await fetchUploadSession(sessionId);

  if (!session) {
    return new Response(null, { status: 404 });
  }

  const tusResumable = request.headers.get("Tus-Resumable") || TUS_VERSION;

  try {
    const response = await forwardTusRequest(session.cloudflareUrl, "HEAD", {
      "Tus-Resumable": tusResumable,
    });

    // Create response with CORS headers
    const headers = new Headers();

    // Copy important headers from Cloudflare response
    const importantHeaders = [
      "Upload-Offset",
      "Upload-Length",
      "Tus-Resumable",
      "Cache-Control",
    ];

    importantHeaders.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    return new Response(null, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error(`TUS HEAD error for session ${sessionId}:`, error);
    return new Response(null, { status: 500 });
  }
}

/**
 * Forward TUS PATCH request to upload chunk
 */
export async function handleTusPatchRequest(
  sessionId: string,
  request: Request
): Promise<Response> {
  const session = await fetchUploadSession(sessionId);

  if (!session) {
    return new Response(null, { status: 404 });
  }

  try {
    // Get request body
    const body = await request.arrayBuffer();

    // Prepare headers for Cloudflare
    const cloudflareHeaders: Record<string, string> = {};

    const tusHeaders = [
      "Tus-Resumable",
      "Upload-Offset",
      "Content-Type",
      "Content-Length",
    ];

    tusHeaders.forEach((header) => {
      const value = request.headers.get(header);
      if (value) {
        cloudflareHeaders[header] = value;
      }
    });

    // Forward to Cloudflare
    const response = await forwardTusRequest(
      session.cloudflareUrl,
      "PATCH",
      cloudflareHeaders,
      body
    );

    // Create response headers
    const headers = new Headers();

    const responseHeadersToCopy = [
      "Upload-Offset",
      "Tus-Resumable",
      "Upload-Expires",
    ];

    responseHeadersToCopy.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    // Check if upload is complete
    const uploadOffset = response.headers.get("Upload-Offset");
    const uploadLength = request.headers.get("Upload-Length");

    if (uploadOffset && uploadLength) {
      const bytesUploaded = parseInt(uploadOffset, 10);
      const totalBytes = parseInt(uploadLength, 10);

      if (bytesUploaded >= totalBytes) {
        console.log(`TUS upload complete for session ${sessionId}`);

        // Mark upload as completed
        try {
          await markUploadCompleted(session.videoId);
        } catch (error) {
          console.error(
            `Failed to mark upload completed for ${sessionId}:`,
            error
          );
        }
      }
    }

    return new Response(null, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error(`TUS PATCH error for session ${sessionId}:`, error);

    // Mark upload as failed
    try {
      await markUploadFailed(
        session.videoId,
        error instanceof Error ? error.message : "Unknown error"
      );
    } catch (dbError) {
      console.error(`Failed to mark upload failed for ${sessionId}:`, dbError);
    }

    return new Response(null, { status: 500 });
  }
}

/**
 * Get upload progress information
 */
export async function getUploadProgress(
  sessionId: string
): Promise<UploadProgress | null> {
  const session = await fetchUploadSession(sessionId);

  if (!session) {
    return null;
  }

  try {
    const response = await forwardTusRequest(session.cloudflareUrl, "HEAD", {
      "Tus-Resumable": TUS_VERSION,
    });

    const uploadOffset = response.headers.get("Upload-Offset");
    const uploadLength = response.headers.get("Upload-Length");

    if (!uploadOffset || !uploadLength) {
      return null;
    }

    const bytesUploaded = parseInt(uploadOffset, 10);
    const totalBytes = parseInt(uploadLength, 10);

    return {
      bytesUploaded,
      totalBytes,
      percentage: Math.round((bytesUploaded / totalBytes) * 100),
    };
  } catch (error) {
    console.error(`Failed to get upload progress for ${sessionId}:`, error);
    return null;
  }
}

/**
 * Cancel upload session
 */
export async function cancelUpload(sessionId: string): Promise<void> {
  const session = await fetchUploadSession(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  try {
    // Mark as failed in database
    await markUploadFailed(session.videoId, "Upload cancelled by user");
  } catch (error) {
    console.error(`Failed to cancel upload ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get upload statistics
 */
export async function fetchUploadStats(): Promise<{
  pending: number;
  uploading: number;
  processing: number;
  ready: number;
  error: number;
  total: number;
}> {
  try {
    return await getUploadStats();
  } catch (error) {
    console.error("Failed to get upload stats:", error);
    return {
      pending: 0,
      uploading: 0,
      processing: 0,
      ready: 0,
      error: 0,
      total: 0,
    };
  }
}

/**
 * Clean up old failed uploads
 */
export async function handleCleanupFailedUploads(
  olderThanHours: number = 24
): Promise<number> {
  try {
    return await cleanupFailedUploads(olderThanHours);
  } catch (error) {
    console.error("Failed to cleanup failed uploads:", error);
    return 0;
  }
}

/**
 * Validate file type from TUS metadata
 */
export function validateFileType(filetype?: string): void {
  if (!filetype) {
    return; // File type validation is optional
  }

  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/x-flv",
    "video/webm",
    "video/3gpp",
    "video/x-matroska",
  ] as const;

  if (
    !allowedMimeTypes.includes(filetype as (typeof allowedMimeTypes)[number])
  ) {
    throw new Error(
      `File type ${filetype} is not supported. Allowed types: ${allowedMimeTypes.join(
        ", "
      )}`
    );
  }
}

/**
 * Create TUS response headers
 */
export function createTusResponseHeaders(
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers = {
    "Tus-Resumable": TUS_VERSION,
    "Tus-Version": TUS_VERSION,
    "Tus-Extension": "creation,expiration",
    "Tus-Max-Size": MAX_FILE_SIZE.toString(),
  };

  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }

  return headers;
}
