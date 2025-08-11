// Webhook processing interfaces
export interface WebhookProcessingResult {
  success: boolean;
  videoId: string;
  action: string;
  error?: string;
}
