"use client";
import React from "react";
import { Upload, Video, Home, Cloud, Play } from "lucide-react";
import Link from "next/link";
import VideoUploadForm from "@/components/upload/VideoUploadForm";

export default function UploadPage() {
  // Handle upload success callback
  const handleUploadSuccess = (videoId: string) => {
    console.log("Upload successful! Video ID:", videoId);

    // You can add additional success handling here if needed
    // For example: tracking analytics, showing notifications, etc.
  };

  // Handle upload error callback
  const handleUploadError = (error: string) => {
    console.error("Upload failed:", error);

    // You can add additional error handling here if needed
    // For example: error tracking, notifications, etc.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Video className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EduStream
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
              <Link
                href="/videos"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Browse Videos
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Upload Your
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Educational Content
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Share your knowledge with the world. Upload videos with rich
            metadata powered by Cloudflare Stream.
          </p>
        </div>

        {/* Upload Form Component */}
        <VideoUploadForm
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        {/* Help Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
            <Video className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Supported Formats
            </h3>
            <p className="text-gray-600 text-sm">
              MP4, MOV, AVI, WMV, FLV, and most other video formats
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
            <Cloud className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Large File Support
            </h3>
            <p className="text-gray-600 text-sm">
              Up to 3GB with resumable uploads using TUS protocol
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
            <Play className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Resumable Uploads
            </h3>
            <p className="text-gray-600 text-sm">
              Interrupted uploads can be resumed without starting over
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
