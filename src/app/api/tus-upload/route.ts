import { NextRequest } from "next/server";
import { z } from "zod";

import * as videoService from "@/services/VideoService";
import * as uploadService from "@/services/UploadService";
import { tusMetadataSchema } from "@/zod/schemas/upload";
import { safeParseWithSchema } from "@/zod/utils";
import { 
  createErrorResponse, 
  handleValidationError, 
  handleInternalError,
  handleCloudflareError,
  ERROR_CODES
} from "@/lib/middleware/errors";
import { config } from "@/lib/config";

// TUS headers validation schema
const tusHeadersSchema = z.object({
  "upload-length": z.string().transform(Number).pipe(
    z.number().min(1).max(config.upload.maxFileSize)
  ),
  "tus-resumable": z.string().default(config.tus.version),
  "upload-metadata": z.string().optional(),
});

/**
 * OPTIONS - Handle preflight requests
 * CORS is handled by edge middleware
 */
export async function OPTIONS() {
  return new Response(null, { status: 200 });
}

/**
 * POST - Initialize TUS upload session with validation
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate TUS headers
    const rawHeaders = {
      "upload-length": req.headers.get("Upload-Length"),
      "tus-resumable": req.headers.get("Tus-Resumable"),
      "upload-metadata": req.headers.get("Upload-Metadata"),
    };

    const headerValidation = safeParseWithSchema(tusHeadersSchema, rawHeaders);
    if (!headerValidation.success) {
      console.error("Invalid TUS headers:", headerValidation.errors);
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid TUS headers",
        400,
        headerValidation.errors
      );
    }

    const { 
      "upload-length": uploadLength, 
      "tus-resumable": tusResumable, 
      "upload-metadata": uploadMetadata 
    } = headerValidation.data;

    // 2. Parse and validate metadata
    let tusMetadata: uploadService.TusMetadata;
    
    try {
      tusMetadata = uploadService.parseTusMetadata(uploadMetadata);
    } catch (error) {
      console.error("Metadata parsing error:", error);
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        error instanceof Error ? error.message : "Failed to parse upload metadata",
        400
      );
    }

    // 3. Additional validation
    const metadataValidation = safeParseWithSchema(tusMetadataSchema, {
      filename: tusMetadata.filename || tusMetadata.name,
      filetype: tusMetadata.filetype || 'video/mp4',
      name: tusMetadata.name,
      description: tusMetadata.description,
    });

    if (!metadataValidation.success) {
      console.error("Invalid metadata:", metadataValidation.errors);
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid upload metadata",
        400,
        metadataValidation.errors
      );
    }

    // 4. Validate file type if provided
    if (tusMetadata.filetype) {
      try {
        uploadService.validateFileType(tusMetadata.filetype);
      } catch (error) {
        return createErrorResponse(
          ERROR_CODES.INVALID_FILE_TYPE,
          error instanceof Error ? error.message : "Invalid file type",
          415
        );
      }
    }

    // 5. Create video with upload session
    const { video, uploadSession } = await videoService.createVideo({
      title: tusMetadata.name,
      description: tusMetadata.description,
      uploadLength,
      tusResumable,
    });

    console.log(`TUS session created successfully. Video ID: ${video.cloudflare_video_id}, Title: "${video.title}"`);

    // 6. Create response headers
    const responseHeaders = uploadService.createTusResponseHeaders({
      "Location": `/api/tus-upload/${uploadSession.streamMediaId}`,
      "Upload-Offset": "0",
    });

    return new Response(null, {
      status: 201,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("TUS POST error:", error);

    if (error instanceof Error && error.message.includes('Cloudflare')) {
      return handleCloudflareError(500, error.message);
    }

    return handleInternalError("Failed to initialize upload session");
  }
}
