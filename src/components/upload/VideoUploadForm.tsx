"use client";
import React, { useRef, useState, useEffect } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Cloud,
  Play,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Upload as TusUpload } from "tus-js-client";
import { CHUNK_SIZE, TUS_RETRY_DELAYS } from "@/lib/constants/upload";
import UploadProgressPanel from "./UploadProgressPanel";

// Validation imports
import { reactHookFormSchema } from "@/zod/upload";
import { MAX_FILE_SIZE } from "@/lib/constants/upload";
import ChapterInput from "./ChapterInput";

// Helper function for formatting file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface VideoUploadFormProps {
  onUploadSuccess?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export default function VideoUploadForm({
  onUploadSuccess,
  onUploadError,
  className = "",
}: VideoUploadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
  } = useForm<
    z.input<typeof reactHookFormSchema>,
    any,
    z.output<typeof reactHookFormSchema>
  >({
    resolver: zodResolver(reactHookFormSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      file: undefined,
      chapters: "",
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchedFile = watch("file");
  const watchedChapters = watch("chapters");

  // Upload state
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const tusUploadRef = useRef<TusUpload | null>(null);

  // Register file field with custom onChange
  const { ref: fileRef, ...fileRegister } = register("file", {
    onChange: (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setValue("file", file, { shouldValidate: true });
      } else {
        setValue("file", undefined, { shouldValidate: true });
      }
    },
  });

  const resetForm = () => {
    reset();
    setProgress(0);
    setSuccess(false);
    setIsUploading(false);
    setVideoId(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (tusUploadRef.current) {
      tusUploadRef.current = null;
    }
  };

  // Upload functions
  const handleUpload = async () => {
    if (!isValid || !watchedFile) {
      const errorMessage = "Please fill in all required fields correctly";
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await startTusUpload(watchedFile);
    } catch (err: unknown) {
      setIsUploading(false);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    }
  };

  const startTusUpload = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const upload = new TusUpload(file, {
        endpoint: "/api/tus-upload",
        chunkSize: CHUNK_SIZE,
        retryDelays: TUS_RETRY_DELAYS,
        metadata: {
          filename: file.name,
          filetype: file.type,
          name: watch("title").trim(),
          description: watch("description")?.trim() || "",
          chapters: watch("chapters")?.trim() || "",
        },

        onError: (error) => {
          setIsUploading(false);
          setProgress(0);
          reject(error);
        },

        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal) * 100;
          setProgress(Math.round(percentage));
        },

        onSuccess: () => {
          setSuccess(true);
          setIsUploading(false);
          setProgress(100);

          if (upload.url) {
            const matches = upload.url.match(/\/api\/tus-upload\/([^\/]+)$/);
            const videoId = matches ? matches[1] : null;
            setVideoId(videoId);
            if (videoId) {
              onUploadSuccess?.(videoId);
            }
          }

          resolve();
        },
      });

      tusUploadRef.current = upload;

      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        })
        .catch(() => {
          upload.start();
        });
    });
  };

  return (
    <div
      className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 p-8 md:p-12 ${className}`}
    >
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
                errors.title
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 focus:border-blue-500 hover:border-gray-300"
              }`}
            type="text"
            placeholder="Enter a descriptive title for your video..."
            {...register("title")}
          />
          {errors.title && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Description Textarea */}
        <div className="space-y-2">
          <label className="flex items-center text-gray-900 font-semibold text-lg">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Video Description
            <span className="text-gray-400 ml-2 font-normal">(optional)</span>
          </label>
          <textarea
            className={`w-full px-6 py-4 border-2 rounded-xl bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 hover:border-gray-300 resize-none
              ${errors.description ? "border-red-500" : "border-gray-200"}`}
            rows={4}
            placeholder="Provide additional details about your video content, learning objectives, or target audience..."
            {...register("description")}
          />
          {errors.description && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Chapters Input */}
        <ChapterInput
          value={watchedChapters || ""}
          onChange={(value) => setValue("chapters", value)}
          error={errors.chapters}
          disabled={false}
        />

        {/* File Upload */}
        <div className="space-y-4">
          <label className="flex items-center text-gray-900 font-semibold text-lg">
            <Cloud className="w-5 h-5 mr-2 text-green-600" />
            Choose Video File
            <span className="text-red-500 ml-1">*</span>
          </label>

          <div className="relative">
            <input
              ref={(e) => {
                fileRef(e);
                fileInputRef.current = e;
              }}
              type="file"
              accept="video/*"
              {...fileRegister}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                watchedFile
                  ? "border-green-500 bg-green-50"
                  : errors.file
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 hover:border-blue-500 hover:bg-blue-50/50"
              } cursor-pointer`}
            >
              {watchedFile ? (
                <div className="space-y-3">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {watchedFile.name}
                    </p>
                    <p className="text-gray-600">
                      {formatFileSize(watchedFile.size)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ✅ Valid video file • Supports resumable uploads
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
                    <p className="text-gray-600">or click to browse files</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports MP4, MOV, AVI, WMV, FLV, WebM, MKV (up to{" "}
                      {formatFileSize(MAX_FILE_SIZE)})
                      <br />
                      Large files supported with resumable uploads
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {errors.file && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.file.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        {!success && (
          <button
            onClick={handleUpload}
            disabled={!isValid || isUploading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center text-lg"
          >
            <Upload className="w-6 h-6 mr-3" />
            {isUploading ? "Uploading..." : "Upload Video"}
          </button>
        )}

        {/* Progress Panel */}
        {(isUploading || uploadError) && (
          <UploadProgressPanel
            progress={progress}
            isUploading={isUploading}
            success={false}
            videoId={null}
            error={uploadError}
            onCancel={() => {}}
            onReset={() => {}}
          />
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
                onClick={resetForm}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
