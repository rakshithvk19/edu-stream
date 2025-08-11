// Upload service interfaces
export interface TusHeaders {
  "upload-length": number;
  "tus-resumable": string;
  "upload-metadata"?: string;
}

export interface TusMetadata {
  filename?: string;
  filetype?: string;
  name: string;
  description?: string;
  chapters: string;
}

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}
