import { NextRequest } from "next/server";
import { z } from "zod";

import * as videoService from "@/services/VideoService";
import * as uploadService from "@/services/UploadService";
import { tusMetadataSchema } from "@/zod/upload";
import { MAX_FILE_SIZE } from "@/lib/constants/upload";

// TUS headers validation schema
const tusHeadersSchema = z.object({
  "upload-length": z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(MAX_FILE_SIZE)),
  "tus-resumable": z.string().default("1.0.0"),
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

    const headerValidation = tusHeadersSchema.safeParse(rawHeaders);
    if (!headerValidation.success) {
      console.error("Invalid TUS headers:", headerValidation.error.issues);
      return Response.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid TUS headers",
          details: headerValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      "upload-length": uploadLength,
      "tus-resumable": tusResumable,
      "upload-metadata": uploadMetadata,
    } = headerValidation.data;

    // 2. Parse and validate metadata
    let tusMetadata: uploadService.TusMetadata;

    try {
      tusMetadata = uploadService.parseTusMetadata(uploadMetadata);
    } catch (error) {
      console.error("Metadata parsing error:", error);
      return Response.json(
        {
          error: "VALIDATION_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to parse upload metadata",
        },
        { status: 400 }
      );
    }

    // 3. Additional validation
    const validationInput = {
      filename: tusMetadata.filename || tusMetadata.name,
      filetype: tusMetadata.filetype || "video/mp4",
      name: tusMetadata.name,
      description: tusMetadata.description,
      chapters: tusMetadata.chapters,
    };
    
    const metadataValidation = tusMetadataSchema.safeParse(validationInput);

    if (!metadataValidation.success) {
      console.error("Invalid metadata:", metadataValidation.error.issues);
      return Response.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid upload metadata",
          details: metadataValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // 4. Validate file type if provided
    if (tusMetadata.filetype) {
      try {
        uploadService.validateFileType(tusMetadata.filetype);
      } catch (error) {
        return Response.json(
          {
            error: "INVALID_FILE_TYPE",
            message:
              error instanceof Error ? error.message : "Invalid file type",
          },
          { status: 415 }
        );
      }
    }

    // 5. Create video with upload session
    const { video, uploadSession } = await videoService.createVideo({
      title: tusMetadata.name,
      description: tusMetadata.description,
      uploadLength,
      tusResumable,
      chapters: tusMetadata.chapters,
    });

    console.log(
      `TUS session created successfully. Video ID: ${video.cloudflare_video_id}, Title: "${video.title}"`
    );

    // 6. Create response headers
    const responseHeaders = uploadService.createTusResponseHeaders({
      Location: `/api/tus-upload/${uploadSession.streamMediaId}`,
      "Upload-Offset": "0",
    });

    return new Response(null, {
      status: 201,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("TUS POST error:", error);

    if (error instanceof Error && error.message.includes("Cloudflare")) {
      return Response.json(
        {
          error: "CLOUDFLARE_ERROR",
          message: `Cloudflare API error: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to initialize upload session",
      },
      { status: 500 }
    );
  }
}
