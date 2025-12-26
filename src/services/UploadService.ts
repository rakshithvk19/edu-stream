import {
  fetchUploadSession,
  markUploadCompleted,
} from "@/repositories/UploadRepository";
import {
  parseUploadMetadata,
  forwardTusRequest,
} from "@/services/CloudflareService";
import { MAX_FILE_SIZE, TUS_VERSION } from "@/lib/constants/upload";
import type { UploadSession } from "@/types/repositories/uploadRepository";
import type { TusMetadata } from "@/types/services/upload";

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
  } catch {
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
  } catch {
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
        // Mark upload as completed
        try {
          await markUploadCompleted(session.videoId);
        } catch (error) {
          console.log("Failed to mark upload completed:", error);
        }
      }
    }

    return new Response(null, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("TUS upload chunk failed:", error);

    return new Response(null, { status: 500 });
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
