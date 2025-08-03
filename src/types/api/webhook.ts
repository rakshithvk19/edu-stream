export interface CloudflareStreamWebhookPayload {
  eventType: string;
  video: {
    uid: string;
    status: {
      state: "inprogress" | "ready" | "error" | "pendingupload";
      pctComplete?: string;
      errorReasonCode?: string;
      errorReasonText?: string;
    };
    meta: {
      [key: string]: unknown;
    };
    created: string;
    modified: string;
    size?: number;
    preview?: string;
    allowedOrigins?: string[];
    requireSignedURLs: boolean;
    uploaded: string;
    uploadExpiry?: string;
    maxSizeBytes?: number;
    maxDurationSeconds?: number;
    duration?: number;
    input: {
      width?: number;
      height?: number;
    };
    playback?: {
      hls?: string;
      dash?: string;
    };
    watermark?: {
      uid: string;
    };
    nft?: {
      contract: string;
      token: string;
    };
    liveInput?: string;
    clippedFrom?: {
      uid: string;
      start: number;
      end: number;
    };
  };
  eventTimestamp: string;
}
