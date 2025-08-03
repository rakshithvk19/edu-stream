"use client";
import React from 'react';
import { Search } from 'lucide-react';
import VideoCard from './VideoCard';
import type { VideoRecord } from '@/repositories/VideoRepository';
import type { VideoGridProps, VideoGridSkeletonProps, VideoSearchProps } from '@/types/components/video-grid';

// Skeleton loader for video cards
function VideoCardSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="aspect-video bg-gray-300"></div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-2">
        <div className="h-5 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="flex justify-between items-center mt-3">
          <div className="h-3 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

// Grid of skeleton loaders
function VideoGridSkeleton({ count = 12, className = '' }: VideoGridSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <VideoCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Search component (placeholder for now)
function VideoSearch({ onSearch: _onSearch, placeholder = "Search videos...", disabled = false, className = '' }: VideoSearchProps) {
  return (
    <div className={`relative max-w-lg mx-auto ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white/60 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        onChange={(_e) => {
          // For now, this is just a placeholder - search functionality will be added later
          // onSearch?.(e.target.value);
        }}
      />
    </div>
  );
}

// Main VideoGrid component
export default function VideoGrid({ 
  videos, 
  loading = false, 
  error = null, 
  hasMore = false, 
  onLoadMore, 
  className = '' 
}: VideoGridProps) {
  // Handle video card click
  const handleVideoClick = (_video: VideoRecord) => {
    // Navigation is handled by Link component in VideoCard
  };

  // Error state
  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Videos</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={className}>
        {/* Search component (disabled during loading) */}
        <div className="mb-8">
          <VideoSearch disabled={true} />
        </div>
        
        {/* Skeleton grid */}
        <VideoGridSkeleton count={12} />
      </div>
    );
  }

  // Empty state
  if (!videos || videos.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        {/* Search component */}
        <div className="mb-8">
          <VideoSearch />
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 max-w-md mx-auto">
          <h3 className="text-gray-800 font-semibold mb-2">No Videos Found</h3>
          <p className="text-gray-600 text-sm">
            No videos are available for streaming at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search component */}
      <div className="mb-8">
        <VideoSearch />
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onClick={handleVideoClick}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center mt-8">
          <button
            onClick={onLoadMore}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200"
          >
            Load More Videos
          </button>
        </div>
      )}
    </div>
  );
}

// Export skeleton for standalone use
export { VideoGridSkeleton, VideoSearch };
