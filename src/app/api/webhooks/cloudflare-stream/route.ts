import { NextRequest } from "next/server";

import * as webhookService from "@/services/WebhookService";
import { 
  createErrorResponse,
  handleInternalError,
  handleMethodNotAllowedError,
  ERROR_CODES
} from "@/lib/middleware/errors";

/**
 * POST - Handle Cloudflare Stream webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await req.text();

    // 2. Verify webhook signature if configured
    const signature = req.headers.get("cf-webhook-signature");
    const isValidSignature = webhookService.verifyWebhookSignature(rawBody, signature);

    if (!isValidSignature) {
      console.error("Invalid webhook signature");
      return createErrorResponse(
        ERROR_CODES.UNAUTHORIZED,
        "Invalid webhook signature",
        401
      );
    }

    // 3. Parse and validate payload
    let payload;
    try {
      payload = webhookService.parseWebhookPayload(rawBody);
    } catch (error) {
      console.error("Failed to parse webhook payload:", error);
      return createErrorResponse(
        ERROR_CODES.INVALID_REQUEST,
        error instanceof Error ? error.message : "Invalid webhook payload",
        400
      );
    }

    // 4. Log incoming webhook for debugging
    console.log(
      `Received Cloudflare Stream webhook: ${payload.eventType} for video ${payload.video.uid}`
    );

    // 5. Process webhook with retry logic
    const result = await webhookService.processWebhookWithRetry(payload);

    if (!result.success) {
      console.error(`Webhook processing failed: ${result.error}`);
      // Still return 200 to prevent webhook retries for application errors
      return Response.json({ 
        received: true, 
        processed: false, 
        error: result.error 
      });
    }

    console.log(`Webhook processed successfully: ${result.action} for video ${result.videoId}`);

    return Response.json({ 
      received: true, 
      processed: true,
      action: result.action,
      videoId: result.videoId
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return handleInternalError("Failed to process webhook");
  }
}

/**
 * GET - Webhook health check / configuration info
 */
export async function GET() {
  try {
    const configValidation = webhookService.validateWebhookConfig();
    
    return Response.json({
      status: "active",
      configured: configValidation.isValid,
      warnings: configValidation.warnings,
      errors: configValidation.errors,
    });
  } catch (error) {
    console.error("Webhook health check error:", error);
    return handleInternalError("Failed to get webhook status");
  }
}

/**
 * Handle unsupported methods
 */
export const PUT = () => handleMethodNotAllowedError(['POST', 'GET']);
export const DELETE = () => handleMethodNotAllowedError(['POST', 'GET']);
export const PATCH = () => handleMethodNotAllowedError(['POST', 'GET']);
