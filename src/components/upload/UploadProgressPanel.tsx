"use client";
import React from "react";
import {
  AlertCircle,
} from "lucide-react";

interface UploadProgressPanelProps {
  progress: number;
  isUploading: boolean;
  success: boolean;
  videoId: string | null;
  error: string | null;
  onCancel: () => void;
  onReset: () => void;
}

export default function UploadProgressPanel({
  progress,
  isUploading,
  success,
  videoId,
  error,
  onCancel,
  onReset,
}: UploadProgressPanelProps) {

  return (
    <div className="space-y-4">
      {/* Upload Progress */}
      {isUploading && (
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
            Uploading to Cloudflare Stream... {progress}%
          </p>
          <p className="text-center text-gray-500 text-sm">
            Resumable upload - you can safely close and reopen this page
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}