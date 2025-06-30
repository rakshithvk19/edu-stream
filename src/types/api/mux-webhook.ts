interface MuxWebhookEvent {
  type: string;
  created_at: string;
  data: {
    id: string;
    upload_id?: string;
    playback_ids?: Array<{ id: string; policy: string }>;
    duration?: number;
    max_stored_resolution?: string;
    max_stored_frame_rate?: number;
    aspect_ratio?: string;
    status?: string;
    errors?: Array<{ type: string; message: string }>;
    [key: string]: any;
  };
  object: {
    type: string;
    id: string;
  };
  id: string;
  environment: {
    name: string;
    id: string;
  };
}

interface WebhookResponse {
  received: boolean;
  processed?: boolean;
  message?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  timestamp?: string;
}