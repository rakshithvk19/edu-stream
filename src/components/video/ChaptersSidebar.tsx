"use client";
import React from 'react';
import { Play, Clock } from 'lucide-react';
import type { Chapter } from '@/lib/utils/chapters';

interface ChaptersSidebarProps {
  chapters: Chapter[];
  currentTime?: number;
  onChapterClick: (chapter: Chapter) => void;
  className?: string;
}

export default function ChaptersSidebar({ 
  chapters, 
  currentTime = 0, 
  onChapterClick, 
  className = '' 
}: ChaptersSidebarProps) {
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => timestamp;

  return (
    <div className={`flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center p-6 pb-4 flex-shrink-0">
        <Clock className="w-5 h-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          Chapters
        </h3>
        <span className="ml-2 text-sm text-gray-500">
          ({chapters.length})
        </span>
      </div>

      {/* Chapters List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-1">
          {chapters.map((chapter, index) => {
            const isActive = currentTime >= chapter.start_seconds && 
              (index === chapters.length - 1 || currentTime < chapters[index + 1]?.start_seconds);

            return (
              <button
                key={index}
                onClick={() => onChapterClick(chapter)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group hover:bg-blue-50 hover:shadow-sm ${
                  isActive 
                    ? 'bg-blue-100 border border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Play Icon */}
                  <div className={`flex-shrink-0 mt-0.5 ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'
                  }`}>
                    <Play className="w-4 h-4" />
                  </div>

                  {/* Chapter Content */}
                  <div className="flex-1 min-w-0">
                    {/* Timestamp */}
                    <div className={`text-xs font-mono font-medium mb-1 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(chapter.timestamp)}
                    </div>

                    {/* Title */}
                    <div className={`text-sm font-medium leading-tight ${
                      isActive ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {chapter.title}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}