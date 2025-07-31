"use client";
import React, { useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Cloud,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import UploadProgressPanel from "./UploadProgressPanel";

// Validation imports
import { reactHookFormSchema, type ReactHookFormData } from "@/zod/upload";
import { MAX_FILE_SIZE } from "@/lib/constants/upload";

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
  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ReactHookFormData>({
    resolver: zodResolver(reactHookFormSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      file: undefined,
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchedFile = watch("file");

  // Register file field manually since file inputs need special handling
  const { ref: fileRef, ...fileRegister } = register("file");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      console.log(
        "File selected:",
        selectedFile.name,
        formatFileSize(selectedFile.size)
      );
    }
  };

  const resetForm = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Check if form can be submitted
  const canSubmit = Boolean(
    watchedFile && watch("title")?.trim() && Object.keys(errors).length === 0
  );

  // Prepare validated form data for upload
  const getValidatedFormData = () => {
    if (!canSubmit || !watchedFile) return null;

    return {
      title: watch("title").trim(),
      description: watch("description")?.trim() || "",
      file: watchedFile,
    };
  };

  const validatedFormData = getValidatedFormData();

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
              onChange={(e) => {
                fileRegister.onChange(e);
                handleFileSelect(e);
              }}
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

        {/* Upload Progress Panel */}
        {validatedFormData && (
          <UploadProgressPanel
            formData={validatedFormData}
            onUploadSuccess={onUploadSuccess}
            onUploadError={onUploadError}
            onReset={resetForm}
            canSubmit={canSubmit}
          />
        )}
      </div>
    </div>
  );
}
