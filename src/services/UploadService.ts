import * as uploadsDb from "@/lib/database/uploads";
import * as cloudflare from "@/lib/external/cloudflare";
import { config } from "@/lib/config";
import type { UploadSession } from "@/lib/database/uploads";

// Upload service interfaces
export interface TusHeaders {
  "upload-length": number;
  "tus-resumable": string;
  "upload-metadata"?: string;
}

export interface TusMetadata {
  filename?: string;
  filetype?: string;
  name: string;
  description?: string;
}

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

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

  if (length > config.upload.maxFileSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${config.upload.maxFileSize} bytes`
    );
  }

  return {
    "upload-length": length,
    "tus-resumable": tusResumable || config.tus.version,
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

  const metadata = cloudflare.parseUploadMetadata(metadataString);

  const result: TusMetadata = {
    name: metadata.name || metadata.filename || "Untitled Video",
    filename: metadata.filename,
    filetype: metadata.filetype,
    description: metadata.description,
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
    return await uploadsDb.getUploadSession(sessionId);
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
  const session = await getUploadSession(sessionId);

  if (!session) {
    return new Response(null, { status: 404 });
  }

  const tusResumable =
    request.headers.get("Tus-Resumable") || config.tus.version;

  try {
    const response = await cloudflare.forwardTusRequest(
      session.cloudflareUrl,
      "HEAD",
      {
        "Tus-Resumable": tusResumable,
      }
    );

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
  const session = await getUploadSession(sessionId);

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
    const response = await cloudflare.forwardTusRequest(
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
          await uploadsDb.markUploadCompleted(session.videoId);
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
      await uploadsDb.markUploadFailed(
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
  const session = await getUploadSession(sessionId);

  if (!session) {
    return null;
  }

  try {
    const response = await cloudflare.forwardTusRequest(
      session.cloudflareUrl,
      "HEAD",
      {
        "Tus-Resumable": config.tus.version,
      }
    );

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
  const session = await getUploadSession(sessionId);

  if (!session) {
    throw new Error("Upload session not found");
  }

  try {
    // Mark as failed in database
    await uploadsDb.markUploadFailed(
      session.videoId,
      "Upload cancelled by user"
    );
  } catch (error) {
    console.error(`Failed to cancel upload ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Get upload statistics
 */
export async function getUploadStats(): Promise<{
  pending: number;
  uploading: number;
  processing: number;
  ready: number;
  error: number;
  total: number;
}> {
  try {
    return await uploadsDb.getUploadStats();
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
export async function cleanupFailedUploads(
  olderThanHours: number = 24
): Promise<number> {
  try {
    return await uploadsDb.cleanupFailedUploads(olderThanHours);
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

  if (!config.upload.allowedMimeTypes.includes(filetype as any)) {
    throw new Error(
      `File type ${filetype} is not supported. Allowed types: ${config.upload.allowedMimeTypes.join(
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
    "Tus-Resumable": config.tus.version,
    "Tus-Version": config.tus.version,
    "Tus-Extension": config.tus.extensions.join(","),
    "Tus-Max-Size": config.upload.maxFileSize.toString(),
  };

  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }

  return headers;
}
