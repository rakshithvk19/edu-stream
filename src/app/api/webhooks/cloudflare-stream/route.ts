import { NextRequest } from "next/server";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookWithRetry,
} from "@/services/WebhookService";

/**
 * POST - Handle Cloudflare Stream webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await req.text();

    // 2. Verify webhook signature if configured
    const signature = req.headers.get("cf-webhook-signature");
    const isValidSignature = verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      return Response.json(
        { error: "UNAUTHORIZED", message: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // 3. Parse and validate payload
    let payload;
    try {
      payload = parseWebhookPayload(rawBody);
    } catch (error) {
      return Response.json(
        {
          error: "INVALID_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid webhook payload",
        },
        { status: 400 }
      );
    }

    // 5. Process webhook with retry logic
    const result = await processWebhookWithRetry(payload);

    if (!result.success) {
      // Still return 200 to prevent webhook retries for application errors
      return Response.json({
        received: true,
        processed: false,
        error: result.error,
      });
    }

    return Response.json({
      received: true,
      processed: true,
      action: result.action,
      videoId: result.videoId,
    });
  } catch (error) {
    console.error("Cloudflare Stream webhook processing failed:", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
