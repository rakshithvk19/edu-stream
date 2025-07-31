"use client";
import React, { useState, useEffect } from 'react';
import { Video, Home, Upload, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import VideoGrid from '@/components/video/VideoGrid';
import type { VideoRecord } from '@/repositories/VideoRepository';
import type { VideoListResponse, VideoErrorResponse } from '@/types/api/video-streaming';

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Fetch videos from API
  const fetchVideos = async (pageNum: number = 1, reset: boolean = true) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/videos?page=${pageNum}&limit=12`);
      
      if (!response.ok) {
        const errorData: VideoErrorResponse = await response.json();
        throw new Error(errorData.message || 'Failed to fetch videos');
      }

      const data: VideoListResponse = await response.json();

      if (reset) {
        setVideos(data.videos);
      } else {
        setVideos(prev => [...prev, ...data.videos]);
      }

      setHasMore(data.pagination.hasMore);
      setTotal(data.pagination.total);
      setPage(pageNum);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  // Load initial videos
  useEffect(() => {
    fetchVideos(1, true);
  }, []);

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchVideos(page + 1, false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Video className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EduStream
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
              <Link
                href="/upload"
                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
            <PlayCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Video
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Library
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover and watch educational content from our growing library of videos.
          </p>
          
          {/* Stats */}
          {total > 0 && !loading && (
            <div className="mt-6 text-gray-500">
              <span className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200">
                {total} video{total !== 1 ? 's' : ''} available
              </span>
            </div>
          )}
        </div>

        {/* Video Grid */}
        <VideoGrid
          videos={videos}
          loading={loading}
          error={error}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />

        {/* Empty state when no videos and not loading */}
        {!loading && videos.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-gray-200">
              <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-800 font-semibold mb-2">No Videos Yet</h3>
              <p className="text-gray-600 text-sm mb-4">
                Be the first to upload educational content to our platform!
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
