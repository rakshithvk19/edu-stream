"use client";
import { useState, useRef, useEffect, SyntheticEvent } from "react";
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

  const uploaderRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start upload when both endpoint and file are ready
  useEffect(() => {
    if (endpoint && file && uploaderRef.current && !isUploading) {
      setIsUploading(true);
      // Trigger the upload by dispatching the file-ready event
      setTimeout(() => {
        const evt = new CustomEvent("file-ready", {
          detail: file,
          bubbles: true,
          composed: true,
        });
        uploaderRef.current!.dispatchEvent(evt);
      }, 100);
    }
  }, [endpoint, file, isUploading]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds 2GB limit.");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

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
    } catch (err: any) {
      setError(err.message);
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

      {/* File selection */}
      <div>
        <label className="block text-white font-semibold mb-1">
          Choose video file <span className="text-red-500">*</span>
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
          <p className="text-sm text-gray-400 mt-1">
            Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}
      </div>

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

      {/* Hidden MuxUploader */}
      <MuxUploader
        ref={uploaderRef as any}
        endpoint={endpoint}
        maxFileSize={MAX_FILE_SIZE}
        pausable={true}
        style={{ display: "none" }}
         onProgress={(evt) => {
          const detail = (evt as any).detail;
          
          // The progress value is directly in detail as a number
          let pct = detail;
          
          // If it's a decimal (0-1), convert to percentage
          if (pct && pct <= 1) {
            pct = pct * 100;
          }
          
          // Ensure it's a valid number and clamp between 0-100
          if (pct && !isNaN(pct)) {
            setProgress(Math.round(Math.min(Math.max(pct, 0), 100)));
          }
        }}
        onSuccess={() => {
          setSuccess(true);
          setIsUploading(false);
          resetUpload();
        }}
        onError={(evt: SyntheticEvent) => {
          setError((evt as any).detail.message || "Upload error");
          setIsUploading(false);
          setEndpoint(null);
          setProgress(0);
        }}
      />

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
