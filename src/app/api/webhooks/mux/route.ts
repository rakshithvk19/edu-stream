// src/app/api/webhooks/mux/route.ts
import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";
import type { MuxWebhookPayload } from "@/types/api/mux-webhook";
// Initialize clients
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SIGNATURE_SECRET;
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Validate environment variables at startup
if (!WEBHOOK_SECRET) {
  throw new Error("MUX_WEBHOOK_SIGNATURE_SECRET is required");
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify webhook signature
    try {
      mux.webhooks.verifySignature(rawBody, req.headers, WEBHOOK_SECRET);
    } catch (signatureError) {
      console.error("Webhook signature verification failed:", signatureError);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    let payload: MuxWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("Failed to parse webhook payload:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { type, data } = payload;

    // Log incoming webhook for debugging
    console.log(`Received Mux webhook: ${type} for asset ${data.id}`);

    switch (type) {
      case "video.asset.ready":
        await handleAssetReady(data);
        break;

      case "video.asset.errored":
        await handleAssetError(data);
        break;

      case "video.asset.deleted":
        await handleAssetDeleted(data);
        break;

      case "video.upload.asset_created":
        await handleUploadAssetCreated(data);
        break;

      default:
        console.log(`Unhandled webhook type: ${type}`);
        // Still return 200 for unhandled events to prevent retries
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleAssetReady(data: MuxWebhookPayload["data"]) {
  try {
    // Extract video metadata
    const publicPlaybackId = data.playback_ids?.find(
      (p) => p.policy === "public"
    )?.id;

    // Calculate file size estimate (if duration is available)
    const estimatedSizeBytes = data.duration
      ? Math.round(data.duration * 125000)
      : null; // ~1Mbps estimate

    // Generate thumbnail URL if playback ID is available
    const thumbnailUrl = publicPlaybackId
      ? `https://image.mux.com/${publicPlaybackId}/thumbnail.jpg`
      : null;

    const updateData = {
      status: "ready",
      playback_id: publicPlaybackId ?? null,
      duration_sec: data.duration ?? null,
      size_bytes: estimatedSizeBytes,
      thumbnail_url: thumbnailUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("videos")
      .update(updateData)
      .eq("mux_asset_id", data.id); // Note: using mux_asset_id to match your schema

    if (error) {
      console.error(`Failed to update video ${data.id}:`, error);
      throw error;
    }

    console.log(`Successfully updated video ${data.id} as ready`);
  } catch (error) {
    console.error(`Error handling asset ready for ${data.id}:`, error);
    throw error;
  }
}

async function handleAssetError(data: MuxWebhookPayload["data"]) {
  try {
    const errorMessage =
      data.errors?.map((e) => e.messages.join(", ")).join("; ") ||
      "Unknown processing error";

    const { error } = await supabase
      .from("videos")
      .update({
        status: "errored",
        updated_at: new Date().toISOString(),
      })
      .eq("mux_asset_id", data.id);

    if (error) {
      console.error(
        `Failed to update video ${data.id} with error status:`,
        error
      );
      throw error;
    }

    console.log(
      `Successfully updated video ${data.id} with error status: ${errorMessage}`
    );
  } catch (error) {
    console.error(`Error handling asset error for ${data.id}:`, error);
    throw error;
  }
}

async function handleAssetDeleted(data: MuxWebhookPayload["data"]) {
  try {
    const { error } = await supabase
      .from("videos")
      .update({
        status: "deleted",
        updated_at: new Date().toISOString(),
      })
      .eq("mux_asset_id", data.id);

    if (error) {
      console.error(`Failed to update video ${data.id} as deleted:`, error);
      throw error;
    }

    console.log(`Successfully updated video ${data.id} as deleted`);
  } catch (error) {
    console.error(`Error handling asset deletion for ${data.id}:`, error);
    throw error;
  }
}

async function handleUploadAssetCreated(data: MuxWebhookPayload["data"]) {
  try {
    // This webhook fires when an upload creates an asset
    // Update the status to processing and link the asset
    const { error } = await supabase
      .from("videos")
      .update({
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("mux_asset_id", data.id);

    if (error) {
      console.error(`Failed to update video ${data.id} to processing:`, error);
      throw error;
    }

    console.log(`Successfully updated video ${data.id} to processing status`);
  } catch (error) {
    console.error(`Error handling upload asset created for ${data.id}:`, error);
    throw error;
  }
}
