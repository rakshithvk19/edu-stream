import { NextResponse, type NextRequest } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";
import type {
  VideoUploadRequest,
  VideoUploadResponse,
  ErrorResponse,
} from "@/types/api/create-upload";

/* ------------------------------------------------------------------ */
/*  Client initialization                                             */
/* ------------------------------------------------------------------ */
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function validate(body: any): VideoUploadRequest | null {
  if (!body || typeof body !== "object") return null;

  const { title, description } = body;

  if (!title || typeof title !== "string" || !title.trim() || title.length > 255)
    return null;

  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 1000)
  )
    return null;

  return { title: title.trim(), description: description?.trim() ?? "" };
}

function err(
  message: string,
  status = 400,
  code?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: message, ...(code && { code }) },
    { status }
  );
}

/* ------------------------------------------------------------------ */
/*  POST                                                              */
/* ------------------------------------------------------------------ */
export async function POST(
  req: NextRequest
): Promise<NextResponse<VideoUploadResponse | ErrorResponse>> {
  /* -- parse & validate -- */
  let body: any;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON in request body", 400, "INVALID_JSON");
  }

  const data = validate(body);
  if (!data)
    return err(
      "Invalid request. Title max 255 chars; description max 1000.",
      400,
      "VALIDATION_ERROR"
    );

  const { title, description } = data;

  /* -- create direct upload on Mux -- */
  let upload;
  try {
    upload = await mux.video.uploads.create({
      cors_origin: "*", // adjust for prod
      new_asset_settings: {
        playback_policy: ["public"], // HLS only on free tier
        encoding_tier: "baseline",
        passthrough: JSON.stringify({ title, ts: Date.now() }),
      },
      timeout: 3600,
    });
  } catch (e) {
    console.error("Mux error:", e);
    return err("Failed to create upload URL", 500, "MUX_ERROR");
  }

  /* -- insert stub row in Supabase -- */
  const { error: dbErr } = await supabase.from("videos").insert({
    title,
    description,
    mux_asset_id: null,
    playback_id: null,
    duration_sec: null,
    size_bytes: null,
    thumbnail_url: null,
    status: "uploading",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    mux_upload_id: upload.id,
  });

  if (dbErr) {
    console.error("Supabase insert error:", dbErr);
    try {
      await mux.video.uploads.cancel(upload.id);
    } catch (cancelErr) {
      console.error("Failed to cancel Mux upload:", cancelErr);
    }
    return err("Database error while saving video metadata.", 500, "DB_ERROR");
  }

  /* -- success -- */
  return NextResponse.json(
    {
      uploadUrl: upload.url,
      uploadId: upload.id,
      message: "Upload URL created successfully.",
    },
    { status: 201 }
  );
}

/* ------------------------------------------------------------------ */
/*  Method stubs                                                      */
/* ------------------------------------------------------------------ */
export const GET = () => err("Method not allowed", 405);
export const PUT = GET;
export const DELETE = GET;
