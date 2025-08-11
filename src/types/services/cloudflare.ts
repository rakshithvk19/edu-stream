// Cloudflare Stream API interfaces
export interface CloudflareUploadSession {
  id: string;
  uploadUrl: string;
  streamMediaId: string;
}

export interface CloudflareVideoInfo {
  uid: string;
  status: {
    state: "inprogress" | "ready" | "error" | "pendingupload";
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, unknown>;
  created: string;
  modified: string;
  size?: number;
  duration?: number;
  input: {
    width?: number;
    height?: number;
  };
  playback?: {
    hls?: string;
    dash?: string;
  };
}

export interface CreateUploadSessionData {
  title: string;
  description?: string;
  uploadLength: number;
  tusResumable: string;
}
