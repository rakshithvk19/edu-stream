export interface MuxWebhookPayload {
  type: string;
  data: {
    id: string;
    status?: string;
    playback_ids?: Array<{ id: string; policy: string }>;
    duration?: number;
    max_stored_resolution?: string;
    max_stored_frame_rate?: number;
    aspect_ratio?: string;
    tracks?: Array<{
      type: string;
      max_width?: number;
      max_height?: number;
      duration?: number;
    }>;
    errors?: Array<{
      type: string;
      messages: string[];
    }>;
    passthrough?: string;
  };
  request_id?: string;
  environment?: {
    name: string;
    id: string;
  };
}
