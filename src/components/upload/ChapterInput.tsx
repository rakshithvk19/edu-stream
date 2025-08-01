"use client";
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, List } from "lucide-react";
import { parseChaptersFromText, getExampleChaptersText, type ChapterValidationError } from "@/lib/utils/chapters";
import type { ChapterInputProps } from "@/types/components/chapters";

export default function ChapterInput({
  value,
  onChange,
  error,
  placeholder,
  className = "",
  disabled = false,
}: ChapterInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsedChapters, setParsedChapters] = useState<any[]>([]);

  // Parse chapters for preview (without validation - parent handles validation)
  useEffect(() => {
    if (value.trim()) {
      const { chapters } = parseChaptersFromText(value);
      setParsedChapters(chapters);
    } else {
      setParsedChapters([]);
    }
  }, [value]);

  const hasContent = value.trim().length > 0;
  const hasErrors = Boolean(error);
  const hasValidChapters = parsedChapters.length > 0 && !hasErrors;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between cursor-pointer p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <List className="w-5 h-5 mr-3 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-gray-900">
              Chapters
              <span className="text-gray-400 ml-2 font-normal">(Optional)</span>
            </h3>
            <p className="text-sm text-gray-600">
              {hasValidChapters 
                ? `${parsedChapters.length} chapter${parsedChapters.length !== 1 ? 's' : ''} added`
                : hasContent
                ? hasErrors 
                  ? "Invalid chapters format"
                  : "Processing chapters..."
                : "Add timestamp markers for easy navigation"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasValidChapters && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          {hasErrors && (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Chapter Format:</h4>
            <p className="text-sm text-blue-800 mb-2">
              Each line should contain a timestamp followed by the chapter title:
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-900 block">
              00:00 Introduction<br />
              01:30 Getting Started<br />
              05:45 Main Content
            </code>
            <div className="mt-3 text-xs text-blue-700">
              <p>• First chapter must start at 00:00</p>
              <p>• Minimum 3 chapters required</p>
              <p>• Maximum 20 chapters allowed</p>
              <p>• Each chapter must be at least 10 seconds long</p>
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Chapter Timestamps
            </label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={placeholder || getExampleChaptersText()}
              className={`w-full px-4 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm text-gray-900 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 resize-none font-mono text-sm
                ${hasErrors
                  ? "border-red-500 focus:border-red-500"
                  : hasValidChapters
                  ? "border-green-500 focus:border-green-500"
                  : "border-gray-200 focus:border-indigo-500 hover:border-gray-300"
                }`}
              rows={6}
            />
          </div>

          {/* Validation Error */}
          {hasErrors && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">
                    {error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Preview */}
          {hasValidChapters && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">
                  {parsedChapters.length} Chapter{parsedChapters.length !== 1 ? 's' : ''} Ready
                </h4>
              </div>
              <div className="space-y-1">
                {parsedChapters.slice(0, 3).map((chapter, index) => (
                  <div key={index} className="text-sm text-green-800 flex items-center">
                    <span className="font-mono bg-green-100 px-2 py-0.5 rounded text-xs mr-2">
                      {chapter.timestamp}
                    </span>
                    <span>{chapter.title}</span>
                  </div>
                ))}
                {parsedChapters.length > 3 && (
                  <p className="text-xs text-green-700 italic">
                    ...and {parsedChapters.length - 3} more chapter{parsedChapters.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
