export interface VideoUploadFormProps {
  onUploadSuccess?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export interface UploadProgressPanelProps {
  progress: number;
  isUploading: boolean;
  success: boolean;
  videoId: string | null;
  error: string | null;
  onCancel: () => void;
  onReset: () => void;
}
