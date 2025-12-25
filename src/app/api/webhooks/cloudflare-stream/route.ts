import { NextRequest } from "next/server";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  processWebhookWithRetry,
  validateWebhookConfig,
} from "@/services/WebhookService";

/**
 * POST - Handle Cloudflare Stream webhooks
 */
export async function POST(req: NextRequest) {
  console.log("🔔 [WEBHOOK] POST request received from Cloudflare Stream");
  
  try {
    // 1. Get raw body for signature verification
    const rawBody = await req.text();
    console.log("🔔 [WEBHOOK] Raw body length:", rawBody.length);
    console.log("🔔 [WEBHOOK] Raw body preview:", rawBody.substring(0, 200));

    // 2. Verify webhook signature if configured
    const signature = req.headers.get("cf-webhook-signature");
    const isValidSignature = verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      console.error("Invalid webhook signature");
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
      console.error("Failed to parse webhook payload:", error);
      return Response.json(
        {
          error: "INVALID_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid webhook payload",
        },
        { status: 400 }
      );
    }

    // 4. Log incoming webhook for debugging
    console.log(
      `Received Cloudflare Stream webhook: ${payload.eventType} for video ${payload.video.uid}`
    );

    // 5. Process webhook with retry logic
    const result = await processWebhookWithRetry(payload);

    if (!result.success) {
      console.error(`Webhook processing failed: ${result.error}`);
      // Still return 200 to prevent webhook retries for application errors
      return Response.json({
        received: true,
        processed: false,
        error: result.error,
      });
    }

    console.log(
      `Webhook processed successfully: ${result.action} for video ${result.videoId}`
    );

    return Response.json({
      received: true,
      processed: true,
      action: result.action,
      videoId: result.videoId,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

/**
 * GET - Webhook health check / configuration info
 */
export async function GET() {
  try {
    const configValidation = validateWebhookConfig();

    return Response.json({
      status: "active",
      configured: configValidation.isValid,
      warnings: configValidation.warnings,
      errors: configValidation.errors,
    });
  } catch (error) {
    console.error("Webhook health check error:", error);
    return Response.json(
      { error: "INTERNAL_ERROR", message: "Failed to get webhook status" },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported methods
 */
function handleMethodNotAllowed(allowedMethods: string[]): Response {
  const response = Response.json(
    {
      error: "METHOD_NOT_ALLOWED",
      message: `Method not allowed. Allowed methods: ${allowedMethods.join(
        ", "
      )}`,
    },
    { status: 405 }
  );
  response.headers.set("Allow", allowedMethods.join(", "));
  return response;
}

export const PUT = () => handleMethodNotAllowed(["POST", "GET"]);
export const DELETE = () => handleMethodNotAllowed(["POST", "GET"]);
export const PATCH = () => handleMethodNotAllowed(["POST", "GET"]);
