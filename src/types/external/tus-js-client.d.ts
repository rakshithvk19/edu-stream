// Type definitions for tus-js-client
declare module "tus-js-client" {
  interface TusOptions {
    endpoint: string;
    chunkSize?: number;
    retryDelays?: number[];
    metadata?: { [key: string]: string };
    headers?: { [key: string]: string };
    onError?: (error: Error) => void;
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
    onSuccess?: () => void;
    onAfterResponse?: (req: any, res: any) => void;
    onBeforeRequest?: (req: any) => void;
    onChunkComplete?: (
      chunkSize: number,
      bytesAccepted: number,
      bytesTotal: number
    ) => void;
    fingerprint?: (file: File, options: TusOptions) => Promise<string>;
    resume?: boolean;
    removeFingerprintOnSuccess?: boolean;
    overridePatchMethod?: boolean;
    uploadDataDuringCreation?: boolean;
    uploadLengthDeferred?: boolean;
  }

  interface PreviousUpload {
    size: number | null;
    metadata: { [key: string]: string };
    creationTime: string;
  }

  class Upload {
    file: File | null;
    url: string | null;
    options: TusOptions;

    constructor(file: File | Blob, options: TusOptions);

    start(): Promise<void>;
    abort(): Promise<void>;
    findPreviousUploads(): Promise<PreviousUpload[]>;
    resumeFromPreviousUpload(previousUpload: PreviousUpload): void;
  }

  export { Upload, TusOptions, PreviousUpload };
}
