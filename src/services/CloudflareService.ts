import { MAX_DURATION_SECONDS } from "@/lib/constants/upload";
import type {
  CloudflareUploadSession,
  CloudflareVideoInfo,
  CreateUploadSessionData,
} from "@/types/services/cloudflare";

/**
 * Create TUS upload session with Cloudflare Stream
 */
export async function createCloudflareUploadSession(
  data: CreateUploadSessionData
): Promise<CloudflareUploadSession> {
  console.log("🟡 [CLOUDFLARE] createCloudflareUploadSession called with data:", {
    title: data.title,
    hasDescription: !!data.description,
    uploadLength: data.uploadLength,
    tusResumable: data.tusResumable
  });
  
  // Validate configuration before making API calls
  console.log("🟡 [CLOUDFLARE] Validating Cloudflare config...");
  validateCloudflareConfig();
  console.log("🟡 [CLOUDFLARE] ✅ Config validation passed");

  const uploadMetadata = buildUploadMetadata({
    name: data.title,
    description: data.description || "",
    maxDurationSeconds: MAX_DURATION_SECONDS.toString(),
  });
  
  console.log("🟡 [CLOUDFLARE] Upload metadata built:", uploadMetadata.substring(0, 100) + "...");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  console.log("🟡 [CLOUDFLARE] Environment variables check:", {
    hasAccountId: !!accountId,
    accountIdLength: accountId?.length,
    accountIdPreview: accountId ? accountId.substring(0, 8) + "..." : "MISSING",
    hasApiToken: !!apiToken,
    apiTokenLength: apiToken?.length,
    apiTokenPreview: apiToken ? apiToken.substring(0, 10) + "..." : "MISSING"
  });
  
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;
  console.log("🟡 [CLOUDFLARE] Making POST request to:", apiUrl);
  console.log("🟡 [CLOUDFLARE] Request headers:", {
    Authorization: apiToken ? `Bearer ${apiToken.substring(0, 20)}...` : "MISSING",
    "Tus-Resumable": data.tusResumable,
    "Upload-Length": data.uploadLength.toString(),
    "Upload-Metadata": uploadMetadata.substring(0, 50) + "..."
  });
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Tus-Resumable": data.tusResumable,
      "Upload-Length": data.uploadLength.toString(),
      "Upload-Metadata": uploadMetadata,
    },
  });
  
  console.log("🟡 [CLOUDFLARE] Response received:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("🔴 [CLOUDFLARE] API request failed:", {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText
    });
    throw new Error(
      `Cloudflare Stream API error (${response.status}): ${errorText}`
    );
  }

  const locationHeader = response.headers.get("Location");
  const streamMediaId = response.headers.get("stream-media-id");
  
  console.log("🟡 [CLOUDFLARE] ✅ Success! Response headers:", {
    hasLocation: !!locationHeader,
    location: locationHeader,
    hasStreamMediaId: !!streamMediaId,
    streamMediaId: streamMediaId
  });

  if (!locationHeader || !streamMediaId) {
    console.error("🔴 [CLOUDFLARE] Missing required response headers");
    throw new Error("Missing required headers from Cloudflare Stream response");
  }

  return {
    id: streamMediaId,
    uploadUrl: locationHeader,
    streamMediaId,
  };
}

/**
 * Get video information from Cloudflare Stream
 */
export async function getCloudflareVideoInfo(
  videoId: string
): Promise<CloudflareVideoInfo> {
  // Validate configuration before making API calls
  validateCloudflareConfig();

  if (!videoId || videoId.trim().length === 0) {
    throw new Error("Video ID is required");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Video not found in Cloudflare Stream");
    }
    const errorText = await response.text();
    throw new Error(
      `Cloudflare Stream API error (${response.status}): ${errorText}`
    );
  }

  const result = await response.json();
  return result.result;
}

/**
 * Delete video from Cloudflare Stream
 */
export async function deleteCloudflareVideo(videoId: string): Promise<void> {
  // Validate configuration before making API calls
  validateCloudflareConfig();

  if (!videoId || videoId.trim().length === 0) {
    throw new Error("Video ID is required");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete video from Cloudflare (${response.status}): ${errorText}`
    );
  }
}

/**
 * List videos from Cloudflare Stream
 */
export async function listCloudflareVideos(
  limit: number = 50,
  asc: boolean = false
): Promise<CloudflareVideoInfo[]> {
  // Validate configuration before making API calls
  validateCloudflareConfig();

  // Validate parameters
  if (limit <= 0 || limit > 1000) {
    throw new Error("Limit must be between 1 and 1000");
  }

  const params = new URLSearchParams({
    limit: limit.toString(),
    asc: asc.toString(),
  });

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream?${params}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Cloudflare Stream API error (${response.status}): ${errorText}`
    );
  }

  const result = await response.json();
  return result.result || [];
}

/**
 * Build upload metadata for TUS protocol
 */
export function buildUploadMetadata(data: Record<string, string>): string {
  return Object.entries(data)
    .filter(([_key, value]) => value !== undefined && value !== "")
    .map(([key, value]) => {
      try {
        return `${key} ${btoa(value)}`; // Base64 encode values
      } catch (_error) {
        console.warn(`Failed to encode metadata for key: ${key}`);
        return `${key} ${value}`; // Fallback to plain text
      }
    })
    .join(",");
}

/**
 * Parse upload metadata from TUS protocol
 */
export function parseUploadMetadata(metadata: string): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    metadata.split(",").forEach((pair) => {
      const [key, value] = pair.trim().split(" ");
      if (key && value) {
        try {
          result[key] = atob(value); // Base64 decode
        } catch (_e) {
          console.warn(`Failed to decode metadata value for key: ${key}`);
          result[key] = value; // Use as-is if decode fails
        }
      }
    });
  } catch (error) {
    console.error("Error parsing upload metadata:", error);
    throw new Error("Invalid metadata format");
  }

  return result;
}

/**
 * Forward TUS request to Cloudflare
 */
export async function forwardTusRequest(
  uploadUrl: string,
  method: string,
  headers: Record<string, string>,
  body?: ArrayBuffer
): Promise<Response> {
  const requestOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(60000),
  };

  if (body && (method === "PATCH" || method === "POST")) {
    requestOptions.body = body;
  }

  const response = await fetch(uploadUrl, requestOptions);
  return response;
}

/**
 * Get video thumbnail URL
 */
export function getVideoThumbnailUrl(videoId: string, time?: number): string {
  if (!videoId || videoId.trim().length === 0) {
    throw new Error("Video ID is required");
  }

  const timeParam = time ? `?time=${time}s` : "";
  return `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg${timeParam}`;
}

/**
 * Get video preview URL
 */
export function getVideoPreviewUrl(videoId: string): string {
  if (!videoId || videoId.trim().length === 0) {
    throw new Error("Video ID is required");
  }

  return `https://videodelivery.net/${videoId}/manifests/video.m3u8`;
}

/**
 * Validate Cloudflare Stream configuration
 */
export function validateCloudflareConfig(): void {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error("CLOUDFLARE_API_TOKEN is required");
  }

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is required");
  }
}
