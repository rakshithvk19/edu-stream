"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Cloud,
} from "lucide-react";
import UploadProgressPanel from "./UploadProgressPanel";

// Validation imports
import { uploadFormSchema } from '@/zod/schemas/upload';
import { safeParseWithSchema } from '@/zod/utils';
import { formatFileSize } from '@/lib/utils/formatting';
import type { FormErrors, UploadFormState } from '@/types/components/forms';
import { MAX_FILE_SIZE } from '@/lib/constants/upload';

interface VideoUploadFormProps {
  onUploadSuccess?: (videoId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export default function VideoUploadForm({ 
  onUploadSuccess, 
  onUploadError, 
  className = "" 
}: VideoUploadFormProps) {
  // Form state using Zod validation
  const [formState, setFormState] = useState<UploadFormState>({
    title: "",
    description: "",
    file: null,
    errors: {},
    isValid: false,
    touched: {
      title: false,
      description: false,
      file: false,
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation function using Zod
  const validateForm = useCallback(() => {
    const { title, description, file } = formState;
    
    if (!file) {
      return { 
        success: false, 
        errors: { 
          ...formState.errors,
          file: "Please select a video file" 
        } 
      };
    }

    const formData = {
      title,
      description: description || undefined,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      }
    };

    const result = safeParseWithSchema(uploadFormSchema, formData);
    return result;
  }, [formState]);

  // Real-time field validation
  const validateField = useCallback((field: keyof UploadFormState, value: any) => {
    const tempData = { ...formState, [field]: value };
    
    if (field === 'file' && value) {
      const fileData = {
        title: tempData.title,
        description: tempData.description || undefined,
        file: {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified,
        }
      };
      
      const result = safeParseWithSchema(uploadFormSchema, fileData);
      if (!result.success) {
        return result.errors[field] || result.errors.file;
      }
    } else if (field !== 'file') {
      // Validate just the text fields
      try {
        if (field === 'title') {
          uploadFormSchema.shape.title.parse(value);
        } else if (field === 'description') {
          uploadFormSchema.shape.description.parse(value);
        }
      } catch (error: any) {
        if (error.errors) {
          return error.errors[0]?.message;
        }
      }
    }
    
    return null;
  }, [formState]);

  // Update form field with validation
  const updateField = useCallback((field: keyof UploadFormState, value: any) => {
    const error = validateField(field, value);
    
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: error || undefined
      },
      touched: {
        ...prev.touched,
        [field]: true
      }
    }));
  }, [validateField]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      updateField('file', selectedFile);
      console.log("File selected:", selectedFile.name, formatFileSize(selectedFile.size));
    }
  };

  const resetForm = () => {
    setFormState({
      title: "",
      description: "",
      file: null,
      errors: {},
      isValid: false,
      touched: {
        title: false,
        description: false,
        file: false,
      }
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Check if form can be submitted
  const canSubmit = formState.file && formState.title.trim() && Object.keys(formState.errors).length === 0;

  // Prepare validated form data for upload
  const getValidatedFormData = () => {
    if (!canSubmit || !formState.file) return null;
    
    return {
      title: formState.title.trim(),
      description: formState.description.trim(),
      file: formState.file
    };
  };

  const validatedFormData = getValidatedFormData();

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 p-8 md:p-12 ${className}`}>
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
                formState.touched.title && formState.errors.title
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-200 focus:border-blue-500 hover:border-gray-300"
              }`}
            type="text"
            placeholder="Enter a descriptive title for your video..."
            value={formState.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => setFormState(prev => ({ ...prev, touched: { ...prev.touched, title: true } }))}
          />
          {formState.touched.title && formState.errors.title && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formState.errors.title}
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
            className={`w-full px-6 py-4 border-2 rounded-xl bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 hover:border-gray-300 resize-none
              ${
                formState.touched.description && formState.errors.description
                  ? "border-red-500"
                  : "border-gray-200"
              }`}
            rows={4}
            placeholder="Provide additional details about your video content, learning objectives, or target audience..."
            value={formState.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => setFormState(prev => ({ ...prev, touched: { ...prev.touched, description: true } }))}
          />
          {formState.touched.description && formState.errors.description && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formState.errors.description}
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
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                formState.file
                  ? "border-green-500 bg-green-50"
                  : formState.touched.file && formState.errors.file
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 hover:border-blue-500 hover:bg-blue-50/50"
              } cursor-pointer`}
            >
              {formState.file ? (
                <div className="space-y-3">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formState.file.name}
                    </p>
                    <p className="text-gray-600">
                      {formatFileSize(formState.file.size)}
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
                    <p className="text-gray-600">
                      or click to browse files
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports MP4, MOV, AVI, WMV, FLV, WebM, MKV (up to {formatFileSize(MAX_FILE_SIZE)})
                      <br />
                      Large files supported with resumable uploads
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {formState.touched.file && formState.errors.file && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {formState.errors.file}
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

        {/* Global Error Display */}
        {Object.keys(formState.errors).length > 0 && !validatedFormData && (
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center mb-3">
              <AlertCircle className="w-6 h-6 mr-3" />
              <h3 className="font-bold text-lg">Validation Errors</h3>
            </div>
            <div className="space-y-1">
              {Object.entries(formState.errors).map(([field, error]) => (
                error && (
                  <p key={field} className="text-sm">
                    • {error}
                  </p>
                )
              ))}
            </div>
            <button
              onClick={() => setFormState(prev => ({ ...prev, errors: {} }))}
              className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}