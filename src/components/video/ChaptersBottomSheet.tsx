"use client";
import React, { useEffect, useRef } from "react";
import { X, Play, Clock } from "lucide-react";
import type { ChaptersBottomSheetProps } from "@/types";

export default function ChaptersBottomSheet({
  chapters,
  isOpen,
  onClose,
  onChapterClick,
  className = "",
}: ChaptersBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sheetRef.current &&
        !sheetRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 h-1/4 bg-white/90 backdrop-blur-md border-t border-gray-200 rounded-t-2xl shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        } ${className}`}
        style={{
          animation: isOpen
            ? "slideUp 0.3s ease-out"
            : "slideDown 0.3s ease-out",
        }}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Chapters</h3>
            <span className="ml-2 text-sm text-gray-500">
              ({chapters.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="space-y-1">
            {chapters.map((chapter, index) => (
              <button
                key={index}
                onClick={() => {
                  onChapterClick(chapter);
                  onClose(); // Close sheet after selecting chapter
                }}
                className="w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  {/* Play Icon */}
                  <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500">
                    <Play className="w-4 h-4" />
                  </div>

                  {/* Chapter Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {/* Timestamp */}
                      <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {chapter.timestamp}
                      </span>
                      {/* Title */}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {chapter.title}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100%);
          }
        }
      `}</style>
    </>
  );
}
