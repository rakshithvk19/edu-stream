"use client";
import React from "react";
import { AlertCircle, CheckCircle, X, Play, Upload } from "lucide-react";
import Link from "next/link";
import type { UploadProgressPanelProps } from "@/types/components/upload";

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

          {/* Cancel Button */}
          <div className="text-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors flex items-center mx-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Upload
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {success && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center mb-3">
            <CheckCircle className="w-6 h-6 mr-3" />
            <h3 className="font-bold text-lg">Upload Successful!</h3>
          </div>
          <p className="mb-4">
            Your video has been uploaded successfully and is being processed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReset}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Another Video
            </button>
            <Link
              href="/videos"
              className="px-6 py-2 bg-white text-green-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              <Play className="w-4 h-4 mr-2" />
              View Videos
            </Link>
            {videoId && (
              <Link
                href={`/videos/${videoId}`}
                className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Video
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Upload Failed</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={onReset}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
