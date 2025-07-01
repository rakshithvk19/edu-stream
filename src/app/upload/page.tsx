"use client";
import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Video,
  FileText,
  CheckCircle,
  AlertCircle,
  Home,
  Cloud,
  Play,
} from "lucide-react";
import Link from "next/link";

import MuxUploader from "@mux/mux-uploader-react";

const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024;

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploaderRef = useRef<React.ComponentRef<typeof MuxUploader>>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger upload when we have both endpoint and file
  useEffect(() => {
    if (endpoint && file && uploaderRef.current && !isUploading) {
      setIsUploading(true);

      // Create a new FileList-like object and set it on the uploader
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Access the underlying DOM element and set files
      const uploaderElement =
        uploaderRef.current as unknown as HTMLInputElement;
      if (uploaderElement && uploaderElement.files !== undefined) {
        uploaderElement.files = dataTransfer.files;
      }
    }
  }, [endpoint, file, isUploading]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    setProgress(0);
    setTitleTouched(true);

    // Validation
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!file) {
      setError("Please choose a video file.");
      return;
    }

    try {
      // Create upload endpoint
      const res = await fetch("/api/create-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || "Failed to create upload.");
      }

      const { uploadUrl } = await res.json();
      setEndpoint(uploadUrl);
      // Upload will be triggered by useEffect
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  const resetUpload = () => {
    setFile(null);
    setEndpoint(null);
    setProgress(0);
    setSuccess(false);
    setError(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Clear the uploader's files
    if (uploaderRef.current) {
      const uploaderElement =
        uploaderRef.current as unknown as HTMLInputElement;
      if (uploaderElement && uploaderElement.files !== undefined) {
        uploaderElement.files = new DataTransfer().files; // Empty FileList
      }
    }
  };

  // Handle file selection from the custom file input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds 3GB limit.");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
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
            metadata and let EduStream handle the rest.
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 p-8 md:p-12">
          <div className="space-y-8">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="flex items-center text-gray-900 font-semibold text-lg">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Video Title
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                className={`w-full px-6 py-4 border-2 rounded-xl bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20
                  ${
                    titleTouched && !title.trim()
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-blue-500 hover:border-gray-300"
                  }`}
                type="text"
                placeholder="Enter a descriptive title for your video..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                disabled={isUploading}
              />
              {titleTouched && !title.trim() && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Title is required
                </p>
              )}
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label className="flex items-center text-gray-900 font-semibold text-lg">
                <FileText className="w-5 h-5 mr-2 text-purple-600" />
                Video Description
                <span className="text-gray-400 ml-2 font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 hover:border-gray-300 resize-none"
                rows={4}
                placeholder="Provide additional details about your video content, learning objectives, or target audience..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <label className="flex items-center text-gray-900 font-semibold text-lg">
                <Cloud className="w-5 h-5 mr-2 text-green-600" />
                Choose Video File
                <span className="text-red-500 ml-1">*</span>
              </label>

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    file
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 hover:border-blue-500 hover:bg-blue-50/50"
                  } ${
                    isUploading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {file ? (
                    <div className="space-y-3">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-gray-600">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          Drop your video here
                        </p>
                        <p className="text-gray-600">
                          or click to browse files
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Supports MP4, MOV, AVI and other video formats (max
                          3GB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden Mux Uploader */}
            <MuxUploader
              ref={uploaderRef}
              endpoint={endpoint}
              maxFileSize={MAX_FILE_SIZE}
              pausable
              style={{ display: "none" }} // Hide the default UI
              onProgress={(evt) => {
                const pct = (evt as unknown as CustomEvent<number>).detail;
                setProgress(Math.round(pct));
              }}
              onSuccess={() => {
                setSuccess(true);
                setIsUploading(false);
              }}
              onError={(evt) => {
                const errorDetail = (
                  evt as unknown as CustomEvent<{ message: string }>
                ).detail;
                setError(errorDetail?.message || "Upload error");
                setIsUploading(false);
                setProgress(0);
              }}
            />

            {/* Upload Button and Progress */}
            {!isUploading ? (
              <button
                onClick={handleSubmit}
                disabled={!file || !title.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center text-lg"
              >
                <Upload className="w-6 h-6 mr-3" />
                Upload Video
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
                  Uploading your video... {progress}%
                </p>
                <p className="text-center text-gray-500 text-sm">
                  Please don&apos;t close this page while uploading
                </p>
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
                  Your video is being processed and will be available for
                  streaming shortly.
                </p>
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

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center mb-3">
                  <AlertCircle className="w-6 h-6 mr-3" />
                  <h3 className="font-bold text-lg">Upload Error</h3>
                </div>
                <p className="mb-4">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

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
              File Size Limit
            </h3>
            <p className="text-gray-600 text-sm">
              Maximum file size is 3GB per upload
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200">
            <Play className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Processing Time
            </h3>
            <p className="text-gray-600 text-sm">
              Videos are typically ready for streaming within 5-10 minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
