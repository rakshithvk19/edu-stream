// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";
// import { createClient } from "@supabase/supabase-js";

// /* ------------------------------------------------------------------ */
// /*  Supabase Client                                                    */
// /* ------------------------------------------------------------------ */
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
//   auth: {
//     persistSession: false,
//     autoRefreshToken: false,
//   },
// });

// /* ------------------------------------------------------------------ */
// /*  Constants                                                          */
// /* ------------------------------------------------------------------ */
// const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

// /* ------------------------------------------------------------------ */
// /*  Helper Functions                                                   */
// /* ------------------------------------------------------------------ */
// function verifyMuxSignature(
//   header: string | null,
//   body: string,
//   secret: string,
//   tolerance: number = WEBHOOK_TOLERANCE_SECONDS
// ): boolean {
//   if (!header) {
//     console.warn("Missing Mux-Signature header");
//     return false;
//   }

//   try {
//     // Header format: "t=1657814932,v1=29f8..."
//     const parts = header
//       .split(",")
//       .map((s) => s.trim())
//       .reduce<Record<string, string>>((acc, cur) => {
//         const [k, v] = cur.split("=", 2);
//         if (k && v) acc[k] = v;
//         return acc;
//       }, {});

//     const { t: timestamp, v1: signature } = parts;
//     if (!timestamp || !signature) {
//       console.warn("Invalid signature header format");
//       return false;
//     }

//     // Check timestamp tolerance (prevent replay attacks)
//     const webhookTimestamp = parseInt(timestamp, 10);
//     const currentTimestamp = Math.floor(Date.now() / 1000);

//     if (Math.abs(currentTimestamp - webhookTimestamp) > tolerance) {
//       console.warn(`Webhook timestamp outside tolerance: ${Math.abs(currentTimestamp - webhookTimestamp)}s`);
//       return false;
//     }

//     // Verify signature
//     const signedPayload = `${timestamp}.${body}`;
//     const expected = crypto
//       .createHmac("sha256", secret)
//       .update(signedPayload, "utf8")
//       .digest("hex");

//     const isValid = crypto.timingSafeEqual(
//       Buffer.from(signature, "hex"),
//       Buffer.from(expected, "hex")
//     );

//     if (!isValid) {
//       console.warn("Signature verification failed");
//     }

//     return isValid;
//   } catch (error) {
//     console.error("Error verifying signature:", error);
//     return false;
//   }
// }

// function createErrorResponse(
//   message: string,
//   status: number,
//   code?: string
// ): NextResponse<ErrorResponse> {
//   return NextResponse.json(
//     {
//       error: message,
//       ...(code && { code }),
//       timestamp: new Date().toISOString(),
//     },
//     { status }
//   );
// }

// function generateThumbnailUrl(playbackId: string, options?: { width?: number; height?: number; fit_mode?: string }): string {
//   const params = new URLSearchParams();

//   if (options?.width) params.set('width', options.width.toString());
//   if (options?.height) params.set('height', options.height.toString());
//   if (options?.fit_mode) params.set('fit_mode', options.fit_mode);

//   const queryString = params.toString();
//   return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
// }

// /* ------------------------------------------------------------------ */
// /*  Event Handlers                                                     */
// /* ------------------------------------------------------------------ */
// async function handleUploadAssetCreated(event: MuxWebhookEvent): Promise<void> {
//   const uploadId = event.data.upload_id;
//   const assetId = event.data.id;

//   if (!uploadId || !assetId) {
//     throw new Error("Missing upload_id or asset_id in upload.asset_created event");
//   }

//   console.log(`Processing upload.asset_created: upload_id=${uploadId}, asset_id=${assetId}`);

//   const { data, error } = await supabase
//     .from("videos")
//     .update({
//       mux_asset_id: assetId,
//       status: "processing",
//       updated_at: new Date().toISOString(),
//     })
//     .eq("mux_upload_id", uploadId)
//     .select("id, title");

//   if (error) {
//     console.error("Database error updating asset_created:", error);
//     throw new Error(`Failed to update video record: ${error.message}`);
//   }

//   if (!data || data.length === 0) {
//     console.warn(`No video record found for upload_id: ${uploadId}`);
//     throw new Error(`No video record found for upload_id: ${uploadId}`);
//   }

//   console.log(`Successfully updated video record ${data[0].id} for "${data[0].title}"`);
// }

// async function handleAssetReady(event: MuxWebhookEvent): Promise<void> {
//   const assetId = event.data.id;
//   const playbackIds = event.data.playback_ids || [];
//   const duration = event.data.duration ? Math.round(event.data.duration) : null;
//   const aspectRatio = event.data.aspect_ratio || null;
//   const maxStoredResolution = event.data.max_stored_resolution || null;

//   if (!assetId) {
//     throw new Error("Missing asset_id in asset.ready event");
//   }

//   // Get the public playback ID
//   const publicPlaybackId = playbackIds.find(p => p.policy === "public")?.id || playbackIds[0]?.id || null;

//   const thumbnailUrl = publicPlaybackId
//     ? generateThumbnailUrl(publicPlaybackId, { width: 640, height: 360, fit_mode: 'smartcrop' })
//     : null;

//   console.log(`Processing asset.ready: asset_id=${assetId}, playback_id=${publicPlaybackId}`);

//   const updateData = {
//     playback_id: publicPlaybackId,
//     duration_sec: duration,
//     thumbnail_url: thumbnailUrl,
//     aspect_ratio: aspectRatio,
//     max_resolution: maxStoredResolution,
//     status: "ready" as const,
//     updated_at: new Date().toISOString(),
//   };

//   const { data, error } = await supabase
//     .from("videos")
//     .update(updateData)
//     .eq("mux_asset_id", assetId)
//     .select("id, title");

//   if (error) {
//     console.error("Database error updating asset.ready:", error);
//     throw new Error(`Failed to update video record: ${error.message}`);
//   }

//   if (!data || data.length === 0) {
//     console.warn(`No video record found for asset_id: ${assetId}`);
//     throw new Error(`No video record found for asset_id: ${assetId}`);
//   }

//   console.log(`Successfully marked video ${data[0].id} "${data[0].title}" as ready`);
// }

// async function handleAssetErrored(event: MuxWebhookEvent): Promise<void> {
//   const assetId = event.data.id;
//   const errors = event.data.errors || [];

//   if (!assetId) {
//     throw new Error("Missing asset_id in asset.errored event");
//   }

//   console.log(`Processing asset.errored: asset_id=${assetId}`, errors);

//   const errorMessages = errors.map(e => `${e.type}: ${e.message}`).join("; ");

//   const { data, error } = await supabase
//     .from("videos")
//     .update({
//       status: "errored",
//       error_message: errorMessages || "Unknown error occurred during processing",
//       updated_at: new Date().toISOString(),
//     })
//     .eq("mux_asset_id", assetId)
//     .select("id, title");

//   if (error) {
//     console.error("Database error updating asset.errored:", error);
//     throw new Error(`Failed to update video record: ${error.message}`);
//   }

//   if (!data || data.length === 0) {
//     console.warn(`No video record found for asset_id: ${assetId}`);
//     throw new Error(`No video record found for asset_id: ${assetId}`);
//   }

//   console.log(`Successfully marked video ${data[0].id} "${data[0].title}" as errored`);
// }

// async function handleUploadCancelled(event: MuxWebhookEvent): Promise<void> {
//   const uploadId = event.data.id;

//   if (!uploadId) {
//     throw new Error("Missing upload_id in upload.cancelled event");
//   }

//   console.log(`Processing upload.cancelled: upload_id=${uploadId}`);

//   const { data, error } = await supabase
//     .from("videos")
//     .update({
//       status: "cancelled",
//       updated_at: new Date().toISOString(),
//     })
//     .eq("mux_upload_id", uploadId)
//     .select("id, title");

//   if (error) {
//     console.error("Database error updating upload.cancelled:", error);
//     throw new Error(`Failed to update video record: ${error.message}`);
//   }

//   if (!data || data.length === 0) {
//     console.warn(`No video record found for upload_id: ${uploadId}`);
//     // Don't throw error for cancelled uploads - they might not exist in our DB
//     return;
//   }

//   console.log(`Successfully marked video ${data[0].id} "${data[0].title}" as cancelled`);
// }

// async function handleUploadErrored(event: MuxWebhookEvent): Promise<void> {
//   const uploadId = event.data.id;
//   const errors = event.data.errors || [];

//   if (!uploadId) {
//     throw new Error("Missing upload_id in upload.errored event");
//   }

//   console.log(`Processing upload.errored: upload_id=${uploadId}`, errors);

//   const errorMessages = errors.map(e => `${e.type}: ${e.message}`).join("; ");

//   const { data, error } = await supabase
//     .from("videos")
//     .update({
//       status: "errored",
//       error_message: errorMessages || "Unknown error occurred during upload",
//       updated_at: new Date().toISOString(),
//     })
//     .eq("mux_upload_id", uploadId)
//     .select("id, title");

//   if (error) {
//     console.error("Database error updating upload.errored:", error);
//     throw new Error(`Failed to update video record: ${error.message}`);
//   }

//   if (!data || data.length === 0) {
//     console.warn(`No video record found for upload_id: ${uploadId}`);
//     throw new Error(`No video record found for upload_id: ${uploadId}`);
//   }

//   console.log(`Successfully marked video ${data[0].id} "${data[0].title}" as errored`);
// }

// /* ------------------------------------------------------------------ */
// /*  POST Handler                                                       */
// /* ------------------------------------------------------------------ */
// export async function POST(req: NextRequest): Promise<NextResponse<WebhookResponse | ErrorResponse>> {
//   const startTime = Date.now();

//   try {
//     /* ------ Read raw body for signature verification ------ */
//     const buffer = await req.arrayBuffer();
//     const rawBody = Buffer.from(buffer).toString("utf8");

//     if (!rawBody) {
//       return createErrorResponse("Empty request body", 400, "EMPTY_BODY");
//     }

//     /* ------ Verify Mux signature ------ */
//     const sigHeader = req.headers.get("Mux-Signature");
//     if (!verifyMuxSignature(sigHeader, rawBody, process.env.MUX_WEBHOOK_SECRET!)) {
//       console.warn("Webhook signature verification failed", {
//         hasHeader: !!sigHeader,
//         bodyLength: rawBody.length,
//         userAgent: req.headers.get("User-Agent"),
//       });
//       return createErrorResponse("Invalid or missing signature", 401, "INVALID_SIGNATURE");
//     }

//     /* ------ Parse event ------ */
//     let event: MuxWebhookEvent;
//     try {
//       event = JSON.parse(rawBody);
//     } catch (parseError) {
//       console.error("Failed to parse webhook JSON:", parseError);
//       return createErrorResponse("Invalid JSON payload", 400, "INVALID_JSON");
//     }

//     /* ------ Validate event structure ------ */
//     if (!event.type || !event.data || !event.id) {
//       console.warn("Invalid webhook event structure:", { type: event.type, hasData: !!event.data, id: event.id });
//       return createErrorResponse("Invalid event structure", 400, "INVALID_EVENT");
//     }

//     console.log(`Received Mux webhook: ${event.type} (${event.id})`);

//     /* ------ Process event based on type ------ */
//     let processed = false;

//     try {
//       switch (event.type) {
//         case "video.upload.asset_created":
//           await handleUploadAssetCreated(event);
//           processed = true;
//           break;

//         case "video.asset.ready":
//           await handleAssetReady(event);
//           processed = true;
//           break;

//         case "video.asset.errored":
//           await handleAssetErrored(event);
//           processed = true;
//           break;

//         case "video.upload.cancelled":
//           await handleUploadCancelled(event);
//           processed = true;
//           break;

//         case "video.upload.errored":
//           await handleUploadErrored(event);
//           processed = true;
//           break;

//         default:
//           console.log(`Ignoring unsupported event type: ${event.type}`);
//           break;
//       }
//     } catch (handlerError: any) {
//       console.error(`Error processing ${event.type} event:`, handlerError);
//       return createErrorResponse(
//         "Failed to process webhook event",
//         500,
//         "PROCESSING_ERROR"
//       );
//     }

//     const processingTime = Date.now() - startTime;
//     console.log(`Webhook processed in ${processingTime}ms: ${event.type} (processed: ${processed})`);

//     const response: WebhookResponse = {
//       received: true,
//       processed,
//       message: processed ? "Event processed successfully" : "Event received but not processed",
//     };

//     return NextResponse.json(response, { status: 200 });

//   } catch (error: any) {
//     const processingTime = Date.now() - startTime;
//     console.error(`Unexpected webhook error after ${processingTime}ms:`, error);

//     return createErrorResponse(error.message, 500, "INTERNAL_ERROR");
//   }
// }

// /* ------------------------------------------------------------------ */
// /*  Method Not Allowed Handlers                                       */
// /* ------------------------------------------------------------------ */
// export async function GET(): Promise<NextResponse<ErrorResponse>> {
//   return createErrorResponse("Method not allowed. This endpoint only accepts POST requests.", 405, "METHOD_NOT_ALLOWED");
// }

// export async function PUT(): Promise<NextResponse<ErrorResponse>> {
//   return createErrorResponse("Method not allowed. This endpoint only accepts POST requests.", 405, "METHOD_NOT_ALLOWED");
// }

// export async function DELETE(): Promise<NextResponse<ErrorResponse>> {
//   return createErrorResponse("Method not allowed. This endpoint only accepts POST requests.", 405, "METHOD_NOT_ALLOWED");
// }
