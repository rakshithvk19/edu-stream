export interface VideoUploadRequest {
  title: string;
  description?: string;
}
export interface VideoUploadResponse {
  uploadUrl: string;
  uploadId: string;
  message: string;
}
export interface ErrorResponse {
  error: string;
  code?: string;
}
