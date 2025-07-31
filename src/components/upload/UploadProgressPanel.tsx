"use client";
import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Upload as TusUpload } from "tus-js-client";
import { CHUNK_SIZE, TUS_RETRY_DELAYS } from '@/lib/constants/upload';

interface UploadProgressPanelProps {
  formData: {
    title: string;
    description: string;
    file: File;
  };
  onUploadSuccess?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
  onReset: () => void;
  canSubmit: boolean;
}

export default function UploadProgressPanel({
  formData,
  onUploadSuccess,
  onUploadError,
  onReset,
  canSubmit,
}: UploadProgressPanelProps) {
  // Upload state
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  const tusUploadRef = useRef<TusUpload | null>(null);

  const handleSubmit = async () => {
    if (!canSubmit) {
      const errorMessage = "Please fill in all required fields correctly";
      onUploadError?.(errorMessage);
      return;
    }

    setIsUploading(true);
    console.log("Starting TUS upload process with validated data...");

    try {
      await startTusUpload(formData.file);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setIsUploading(false);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      onUploadError?.(errorMessage);
    }
  };

  const startTusUpload = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Create TUS upload instance with validated metadata
      const upload = new TusUpload(file, {
        endpoint: "/api/tus-upload",
        chunkSize: CHUNK_SIZE,
        retryDelays: TUS_RETRY_DELAYS,
        metadata: {
          filename: file.name,
          filetype: file.type,
          name: formData.title,
          description: formData.description,
        },
        
        onError: (error) => {
          console.error("TUS upload error:", error);
          setIsUploading(false);
          setProgress(0);
          reject(error);
        },
        
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal) * 100;
          console.log(`Upload progress: ${percentage.toFixed(2)}%`);
          setProgress(Math.round(percentage));
        },
        
        onSuccess: () => {
          console.log("TUS upload completed successfully!");
          setSuccess(true);
          setIsUploading(false);
          setProgress(100);
          
          if (upload.url) {
            const videoId = extractVideoIdFromUrl(upload.url);
            setVideoId(videoId);
            if (videoId) {
              onUploadSuccess?.(videoId);
            }
          }
          
          resolve();
        },
        
        onAfterResponse: (req, res) => {
          console.log("TUS response status:", res.getStatus());
        },
      });

      tusUploadRef.current = upload;

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          console.log("Found previous upload, resuming...");
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      }).catch((error) => {
        console.error("Error finding previous uploads:", error);
        upload.start();
      });
    });
  };

  const cancelUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
      setIsUploading(false);
      setProgress(0);
      const errorMessage = "Upload cancelled";
      onUploadError?.(errorMessage);
    }
  };

  const resetUpload = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current = null;
    }
    
    setVideoId(null);
    setProgress(0);
    setSuccess(false);
    setIsUploading(false);
    
    // Call parent reset to clear form
    onReset();
  };

  const extractVideoIdFromUrl = (url: string): string | null => {
    const matches = url.match(/\/api\/tus-upload\/([^\/]+)$/);
    return matches ? matches[1] : null;
  };

  return (
    <div className="space-y-8">
      {/* Upload Button and Progress */}
      {!isUploading ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center text-lg"
        >
          <Upload className="w-6 h-6 mr-3" />
          Upload Video (Validated)
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-300 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <p className="text-center text-gray-700 font-semibold">
            Uploading to Cloudflare Stream (TUS + Zod)... {progress}%
          </p>
          <p className="text-center text-gray-500 text-sm">
            Resumable upload - you can safely close and reopen this page
          </p>
          <button
            onClick={cancelUpload}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel Upload
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center mb-3">
            <CheckCircle className="w-6 h-6 mr-3" />
            <h3 className="font-bold text-lg">Upload Successful!</h3>
          </div>
          <p className="mb-4">
            Your video has been uploaded to Cloudflare Stream using validated TUS protocol and is being processed. 
            It will be available for streaming shortly.
          </p>
          {videoId && (
            <p className="text-sm mb-4 opacity-90">
              Video ID: {videoId}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={resetUpload}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Another
            </button>
            <Link
              href="/videos"
              className="px-6 py-2 bg-white text-green-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <Play className="w-4 h-4 mr-2" />
              View Videos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}