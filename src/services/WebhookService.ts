import { createHmac, timingSafeEqual } from "crypto";
import {
  handleVideoStatusUpdate,
  updateVideoProcessingResults,
} from "./VideoService";
import type { CloudflareStreamWebhookPayload } from "@/types/api/webhook";
import type { VideoStatus } from "@/types/enum";
import type { WebhookProcessingResult } from "@/types";

/**
 * Verify webhook signature (if secret is configured)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET) {
    console.warn(
      "Webhook secret not configured - signature verification skipped"
    );
    return true; // Allow webhook if no secret is configured
  }

  if (!signature) {
    console.error("Webhook signature is required but not provided");
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
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
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

    // Basic validation of required fields
    if (!payload.eventType) {
      throw new Error("Missing eventType in webhook payload");
    }

    if (!payload.video || !payload.video.uid) {
      throw new Error("Missing video.uid in webhook payload");
    }

    if (!payload.video.status || !payload.video.status.state) {
      throw new Error("Missing video.status.state in webhook payload");
    }

    return payload;
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

  console.log(`Processing webhook: ${eventType} for video ${videoId}`);

  try {
    switch (eventType) {
      case "video.live_input.disconnected":
      case "video.live_input.connected":
        // Handle live input events (not applicable for this use case)
        console.log(`Live input event: ${eventType} for video ${videoId}`);
        return {
          success: true,
          videoId,
          action: "live_input_event_ignored",
        };

      default:
        // Handle video state changes
        return await handleVideoStatusChange(video);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Webhook processing failed for video ${videoId}:`, error);

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

  console.log(`Processing video ${uid} with status: ${state}`);

  // Map Cloudflare states to our video statuses
  const statusMap: Record<string, VideoStatus> = {
    pendingupload: "pending",
    inprogress: "processing",
    ready: "ready",
    error: "error",
  };

  const newStatus = statusMap[state];
  if (!newStatus) {
    console.warn(`Unknown video status: ${state} for video ${uid}`);
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

        if (status.pctComplete) {
          console.log(
            `Video ${uid} processing: ${status.pctComplete}% complete`
          );
        }

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

        console.log(`Video ${uid} is ready for playback`);

        return {
          success: true,
          videoId: uid,
          action: "status_updated_to_ready",
        };

      case "error":
        const errorMessage =
          status.errorReasonText || "Video processing failed";
        console.error(`Video ${uid} processing failed: ${errorMessage}`);

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
    console.error(`Failed to update video ${uid}:`, error);

    return {
      success: false,
      videoId: uid,
      action: "database_update_failed",
      error: errorMessage,
    };
  }
}

/**
 * Get webhook processing statistics
 */
export async function getWebhookStats(): Promise<{
  totalProcessed: number;
  successfulUpdates: number;
  failedUpdates: number;
  lastProcessedAt?: string;
}> {
  // This is a placeholder - in a real implementation, you might want to
  // store webhook processing stats in a separate table or use metrics
  return {
    totalProcessed: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
  };
}

/**
 * Validate webhook configuration
 */
export function validateWebhookConfig(): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET) {
    warnings.push(
      "Webhook secret not configured - signature verification disabled"
    );
  }

  if (!process.env.CLOUDFLARE_API_TOKEN) {
    errors.push("Cloudflare API token not configured");
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    errors.push("Cloudflare account ID not configured");
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Handle webhook processing errors
 */
export function handleWebhookError(
  error: unknown,
  videoId?: string
): WebhookProcessingResult {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown webhook error";

  console.error("Webhook processing error:", {
    error: errorMessage,
    videoId,
  });

  return {
    success: false,
    videoId: videoId || "unknown",
    action: "webhook_error",
    error: errorMessage,
  };
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
        if (attempt > 1) {
          console.log(
            `Webhook processing succeeded on attempt ${attempt} for video ${result.videoId}`
          );
        }
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

      console.warn(
        `Webhook processing attempt ${attempt} failed, retrying...`,
        lastError.message
      );

      // Wait before retrying
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return handleWebhookError(lastError, payload.video.uid);
}
