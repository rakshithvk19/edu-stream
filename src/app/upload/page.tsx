"use client";
import { useState, useRef, useEffect } from "react";
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
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Upload a Video</h1>

      {/* Title input */}
      <div>
        <label className="block text-white font-semibold mb-1">
          Video title <span className="text-red-500">*</span>
        </label>
        <input
          className={`w-full px-4 py-2 border rounded bg-gray-900 text-white
            ${
              titleTouched && !title.trim()
                ? "border-red-500"
                : "border-gray-600"
            }`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTitleTouched(true)}
          disabled={isUploading}
        />
      </div>

      {/* Description textarea */}
      <div>
        <label className="block text-white font-semibold mb-1">
          Video description
        </label>
        <textarea
          className="w-full px-4 py-2 border border-gray-600 bg-gray-900 text-white rounded"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isUploading}
        />
      </div>

      {/* Custom file input */}
      <div>
        <label className="block text-white font-semibold mb-2">
          Choose Video File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="w-full px-4 py-2 border border-gray-600 bg-gray-900 text-white rounded file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-300">
            Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
          </p>
        )}
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

      {/* Upload button and progress */}
      {!isUploading ? (
        <button
          onClick={handleSubmit}
          disabled={!file || !title.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
        >
          Upload Video
        </button>
      ) : (
        <div className="space-y-2">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-white">Uploading... {progress}%</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mt-4 p-4 bg-green-800 text-white rounded">
          Upload successful! Your video is being processed.
          <button
            onClick={resetUpload}
            className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            Upload Another
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-red-700 text-white rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-800 rounded text-sm"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
