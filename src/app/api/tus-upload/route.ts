import { NextRequest } from "next/server";
import { z } from "zod";
import { createVideo } from "@/services/VideoService";
import {
  parseTusMetadata,
  validateFileType,
  createTusResponseHeaders,
} from "@/services/UploadService";
import { tusMetadataSchema } from "@/zod/upload";
import { MAX_FILE_SIZE } from "@/lib/constants/upload";
import type { TusMetadata } from "@/types";

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

    console.log("🟠 [TUS API] ✅ Headers validated:", {
      uploadLength,
      tusResumable,
      hasMetadata: !!uploadMetadata
    });

    // 2. Parse and validate metadata
    let tusMetadata: TusMetadata;

    console.log("🟠 [TUS API] Parsing TUS metadata...");
    try {
      tusMetadata = parseTusMetadata(uploadMetadata);
    } catch (error) {
      console.error("🔴 [TUS API] Metadata parsing error:", error);
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

    console.log("🟠 [TUS API] ✅ Metadata parsed:", {
      name: tusMetadata.name,
      filename: tusMetadata.filename,
      filetype: tusMetadata.filetype,
      hasDescription: !!tusMetadata.description,
      hasChapters: !!tusMetadata.chapters
    });

    // 3. Additional validation
    console.log("🟠 [TUS API] Validating metadata with Zod schema...");
    const validationInput = {
      filename: tusMetadata.filename || tusMetadata.name,
      filetype: tusMetadata.filetype || "video/mp4",
      name: tusMetadata.name,
      description: tusMetadata.description,
      chapters: tusMetadata.chapters,
    };

    const metadataValidation = tusMetadataSchema.safeParse(validationInput);

    if (!metadataValidation.success) {
      console.error("🔴 [TUS API] Invalid metadata:", metadataValidation.error.issues);
      return Response.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid upload metadata",
          details: metadataValidation.error.issues,
        },
        { status: 400 }
      );
    }

    console.log("🟠 [TUS API] ✅ Metadata validation passed");

    // 4. Validate file type if provided
    if (tusMetadata.filetype) {
      console.log("🟠 [TUS API] Validating file type:", tusMetadata.filetype);
      try {
        validateFileType(tusMetadata.filetype);
      } catch (error) {
        console.error("🔴 [TUS API] Invalid file type:", error);
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

    console.log("🟠 [TUS API] ✅ File type validated");

    // 5. Create video with upload session
    console.log("🟠 [TUS API] Creating video with Cloudflare upload session...");
    console.log("🟠 [TUS API] Request data:", {
      title: tusMetadata.name,
      hasDescription: !!tusMetadata.description,
      uploadLength,
      tusResumable,
      hasChapters: !!tusMetadata.chapters
    });
    
    const { video, uploadSession } = await createVideo({
      title: tusMetadata.name,
      description: tusMetadata.description,
      uploadLength,
      tusResumable,
      chapters: tusMetadata.chapters,
    });

    console.log("🟠 [TUS API] ✅ Video created successfully:", {
      videoId: video.cloudflare_video_id,
      title: video.title,
      uploadUrl: uploadSession.uploadUrl,
      streamMediaId: uploadSession.streamMediaId
    });

    // 6. Create response headers
    const responseHeaders = createTusResponseHeaders({
      Location: `/api/tus-upload/${uploadSession.streamMediaId}`,
      "Upload-Offset": "0",
    });

    return new Response(null, {
      status: 201,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("🔴 [TUS API] POST error:", {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

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
