export interface VideoUploadFormProps {
  onUploadSuccess?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}
