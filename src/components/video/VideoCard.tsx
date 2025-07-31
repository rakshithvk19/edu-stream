"use client";
import React from 'react';
import Link from 'next/link';
import { Play, Clock, Calendar } from 'lucide-react';
import { formatVideoDuration } from '@/services/VideoStreamingService';
import type { VideoCardProps } from '@/types/components/video-grid';

export default function VideoCard({ video, onClick, className = '' }: VideoCardProps) {
  const thumbnailUrl = `https://videodelivery.net/${video.cloudflare_video_id}/thumbnails/thumbnail.jpg`;
  
  // Format upload date
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ${className}`}>
      <Link href={`/videos/${video.cloudflare_video_id}`}>
        {/* Thumbnail Container */}
        <div className="relative aspect-video bg-gray-100 overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              // Fallback to a placeholder if thumbnail fails to load
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlmYTJhNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1ibmFpbDwvdGV4dD48L3N2Zz4=';
            }}
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/90 rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-gray-900 fill-current" />
            </div>
          </div>

          {/* Duration Badge */}
          {video.duration_sec && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {formatVideoDuration(video.duration_sec)}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
            {video.title}
          </h3>
          
          {video.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-3 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
              {video.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatUploadDate(video.created_at)}
            </div>
            
            {video.size_bytes && (
              <div className="text-xs text-gray-400">
                {(video.size_bytes / (1024 * 1024)).toFixed(1)} MB
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
