import { MAX_DURATION_SECONDS } from "@/lib/constants/upload";
import type {
  CloudflareUploadSession,
  CreateUploadSessionData,
} from "@/types/services/cloudflare";

/**
 * Create TUS upload session with Cloudflare Stream
 */
export async function createCloudflareUploadSession(
  data: CreateUploadSessionData
): Promise<CloudflareUploadSession> {
  // Validate configuration before making API calls
  validateCloudflareConfig();

  const uploadMetadata = buildUploadMetadata({
    name: data.title,
    description: data.description || "",
    maxDurationSeconds: MAX_DURATION_SECONDS.toString(),
  });

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Tus-Resumable": data.tusResumable,
      "Upload-Length": data.uploadLength.toString(),
      "Upload-Metadata": uploadMetadata,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Cloudflare Stream API error (${response.status}): ${errorText}`
    );
  }

  const locationHeader = response.headers.get("Location");
  const streamMediaId = response.headers.get("stream-media-id");

  if (!locationHeader || !streamMediaId) {
    throw new Error("Missing required headers from Cloudflare Stream response");
  }

  return {
    id: streamMediaId,
    uploadUrl: locationHeader,
    streamMediaId,
  };
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
          result[key] = value; // Use as-is if decode fails
        }
      }
    });
  } catch (error) {
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
