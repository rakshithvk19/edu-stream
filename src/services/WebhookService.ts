import { createHmac, timingSafeEqual } from "crypto";
import {
  updateVideoProcessingResults,
  handleVideoStatusUpdate,
} from "./VideoService";
import type {
  WebhookProcessingResult,
  VideoStatus,
  CloudflareStreamWebhookPayload,
} from "@/types";

/**
 * Verify webhook signature (if secret is configured)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET) {
    return true; // Allow webhook if no secret is configured
  }

  if (!signature) {
    return false;
  }

  try {
    const expectedSignature = createHmac(
      "sha256",
      process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
    )
      .update(payload, "utf8")
      .digest("hex");

    // Compare signatures using a timing-safe comparison
    const providedSignature = signature.replace(/^sha256=/, ""); // Remove prefix if present

    if (expectedSignature.length !== providedSignature.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Parse webhook payload and validate structure
 */
export function parseWebhookPayload(
  rawPayload: string
): CloudflareStreamWebhookPayload {
  try {
    const payload = JSON.parse(rawPayload);

    // Cloudflare sends the video object directly, not wrapped with eventType
    // Validate the video object structure
    if (!payload.uid) {
      throw new Error("Missing uid in webhook payload");
    }

    if (!payload.status || !payload.status.state) {
      throw new Error("Missing status.state in webhook payload");
    }

    // Transform to match our expected structure
    return {
      eventType: `video.${payload.status.state}`, // Derive eventType from status
      video: payload,
      eventTimestamp: payload.modified || new Date().toISOString()
    };
  } catch (error) {
    throw new Error(
      `Invalid webhook payload: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Process Cloudflare Stream webhook
 */
export async function processWebhook(
  eventType: string,
  video: CloudflareStreamWebhookPayload["video"]
): Promise<WebhookProcessingResult> {
  const videoId = video.uid;

  try {
    return await handleVideoStatusChange(video);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      videoId,
      action: "processing_failed",
      error: errorMessage,
    };
  }
}

/**
 * Handle video status changes from webhook
 */
async function handleVideoStatusChange(
  video: CloudflareStreamWebhookPayload["video"]
): Promise<WebhookProcessingResult> {
  const { uid, status, duration, size } = video;
  const state = status.state;

  // Map Cloudflare states to our video statuses
  const statusMap: Record<string, VideoStatus> = {
    pendingupload: "pending",
    inprogress: "processing",
    ready: "ready",
    error: "error",
  };

  const newStatus = statusMap[state];
  if (!newStatus) {
    return {
      success: false,
      videoId: uid,
      action: "unknown_status",
      error: `Unknown video status: ${state}`,
    };
  }

  try {
    switch (state) {
      case "pendingupload":
        await handleVideoStatusUpdate(uid, "pending");
        return {
          success: true,
          videoId: uid,
          action: "status_updated_to_pending",
        };

      case "inprogress":
        await handleVideoStatusUpdate(uid, "processing");

        return {
          success: true,
          videoId: uid,
          action: "status_updated_to_processing",
        };

      case "ready":
        // Update video with all processing results
        await updateVideoProcessingResults(uid, {
          status: "ready",
          playbackId: uid, // In Cloudflare Stream, playback ID is the same as video UID
          durationSec: duration ? Math.round(duration) : undefined,
          sizeBytes: size,
          thumbnailUrl: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
        });

        return {
          success: true,
          videoId: uid,
          action: "status_updated_to_ready",
        };

      case "error":
        const errorMessage =
          status.errorReasonText || "Video processing failed";

        await handleVideoStatusUpdate(uid, "error");

        return {
          success: true,
          videoId: uid,
          action: "status_updated_to_error",
          error: errorMessage,
        };

      default:
        return {
          success: false,
          videoId: uid,
          action: "unhandled_status",
          error: `Unhandled video status: ${state}`,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      videoId: uid,
      action: "database_update_failed",
      error: errorMessage,
    };
  }
}

/**
 * Process webhook with retry logic
 */
export async function processWebhookWithRetry(
  payload: CloudflareStreamWebhookPayload,
  maxRetries: number = 3
): Promise<WebhookProcessingResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await processWebhook(payload.eventType, payload.video);

      if (result.success) {
        return result;
      }

      if (attempt === maxRetries) {
        return result; // Return the failed result after max retries
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, etc.
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : "Unknown webhook error";
  
  return {
    success: false,
    videoId: payload.video.uid || "unknown",
    action: "webhook_error",
    error: errorMessage,
  };
}
