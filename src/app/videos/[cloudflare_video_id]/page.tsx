"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Home,
  Upload,
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  List,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import VideoPlayerWithChapters from "@/components/video/VideoPlayerWithChapters";
import ChaptersSidebar from "@/components/video/ChaptersSidebar";
import ChaptersBottomSheet from "@/components/video/ChaptersBottomSheet";
import { formatVideoDuration } from "@/services/VideoStreamingService";
import type { Chapter } from "@/lib/utils/chapters";
import type {
  VideoDetailsResponse,
  VideoStreamUrlsResponse,
  VideoErrorResponse,
  VideoRecord,
  VideoPlayerWithChaptersRef,
} from "@/types";

export default function VideoPlayerPage() {
  const params = useParams();
  const playerRef = useRef<VideoPlayerWithChaptersRef>(null);

  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [streamingUrls, setStreamingUrls] =
    useState<VideoStreamUrlsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isMobileChaptersOpen, setIsMobileChaptersOpen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const chaptersSidebarRef = useRef<HTMLDivElement>(null);

  const cloudflareVideoId = params?.cloudflare_video_id as string;

  // Fetch video details and streaming URLs
  useEffect(() => {
    if (!cloudflareVideoId) {
      setError("Video ID is required");
      setLoading(false);
      return;
    }

    const fetchVideoData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch video details
        const videoResponse = await fetch(`/api/videos/${cloudflareVideoId}`);

        if (!videoResponse.ok) {
          const errorData: VideoErrorResponse = await videoResponse.json();

          if (videoResponse.status === 404) {
            setError("Video not found or not ready for streaming");
          } else {
            setError(errorData.message || "Failed to load video");
          }
          return;
        }

        const videoData: VideoDetailsResponse = await videoResponse.json();
        setVideo(videoData.video);

        // Load chapters from video metadata
        if (
          videoData.video.chapters &&
          Array.isArray(videoData.video.chapters) &&
          videoData.video.chapters.length > 0
        ) {
          try {
            // Validate that chapters have the expected structure
            const validChapters = videoData.video.chapters.filter(
              (chapter, index) => {
                if (!chapter) {
                  return false;
                }

                if (
                  typeof chapter.title !== "string" ||
                  chapter.title.trim().length === 0
                ) {
                  return false;
                }

                if (
                  typeof chapter.timestamp !== "string" ||
                  chapter.timestamp.trim().length === 0
                ) {
                  return false;
                }

                if (
                  typeof chapter.start_seconds !== "number" ||
                  chapter.start_seconds < 0
                ) {
                  return false;
                }

                return true;
              }
            );

            if (validChapters.length > 0) {
              // Sort chapters by start_seconds to ensure correct order
              const sortedChapters = validChapters.sort(
                (a, b) => a.start_seconds - b.start_seconds
              );
              setChapters(sortedChapters);
            } else {
              setChapters([]);
            }
          } catch (chapterError) {
            setChapters([]);
          }
        } else {
          setChapters([]);
        }

        // Fetch streaming URLs
        const streamResponse = await fetch(
          `/api/videos/${cloudflareVideoId}/stream`
        );

        if (!streamResponse.ok) {
          const errorData: VideoErrorResponse = await streamResponse.json();
          setError(errorData.message || "Failed to load streaming URLs");
          return;
        }

        const streamData: VideoStreamUrlsResponse = await streamResponse.json();
        setStreamingUrls(streamData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [cloudflareVideoId]);

  // Handle video player ready
  const handlePlayerReady = () => {
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      if (
        videoContainerRef.current &&
        chaptersSidebarRef.current &&
        chapters.length > 0
      ) {
        const videoHeight = videoContainerRef.current.offsetHeight;
        chaptersSidebarRef.current.style.height = `${videoHeight}px`;
      }
    }, 100);
  };

  // Handle chapter click
  const handleChapterClick = (chapter: Chapter) => {
    if (playerRef.current) {
      playerRef.current.seekToChapter(chapter);
    }
  };

  // Handle mobile chapters toggle
  const handleMobileChaptersToggle = () => {
    setIsMobileChaptersOpen(!isMobileChaptersOpen);
  };

  // Sync chapters sidebar height with video player height
  useEffect(() => {
    const syncHeights = () => {
      if (
        videoContainerRef.current &&
        chaptersSidebarRef.current &&
        chapters.length > 0
      ) {
        const videoHeight = videoContainerRef.current.offsetHeight;
        chaptersSidebarRef.current.style.height = `${videoHeight}px`;
      }
    };

    // Sync on load and resize
    syncHeights();
    window.addEventListener("resize", syncHeights);

    // Cleanup
    return () => {
      window.removeEventListener("resize", syncHeights);
    };
  }, [video, streamingUrls, chapters]);

  // Handle video player error
  const handlePlayerError = (error: string) => {
    setError(`Video playback error: ${error}`);
  };

  // Format upload date
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle share button (placeholder)
  const handleShare = async () => {
    if (navigator.share && video) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description || `Watch "${video.title}" on EduStream`,
          url: window.location.href,
        });
      } catch (err) {
        // Silent error - share functionality is optional
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
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
                href="/videos"
                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Videos
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {/* Video Player Skeleton */}
            <div className="aspect-video bg-gray-300 rounded-2xl animate-pulse"></div>

            {/* Content Skeleton */}
            <div className="space-y-4">
              <div className="h-8 bg-gray-300 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>

            {/* Mobile Chapters Bottom Sheet */}
            {chapters.length > 0 && (
              <ChaptersBottomSheet
                chapters={chapters}
                isOpen={isMobileChaptersOpen}
                onClose={() => setIsMobileChaptersOpen(false)}
                onChapterClick={handleChapterClick}
              />
            )}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
              <h2 className="text-red-800 font-semibold text-xl mb-2">
                Error Loading Video
              </h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Link
                href="/videos"
                className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Videos
              </Link>
            </div>
          </div>
        )}

        {/* Video Content */}
        {video && streamingUrls && !loading && !error && (
          <div className="space-y-8">
            {/* Video Player with Chapters Layout */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Video Player - 75% on desktop, full width on mobile */}
              <div className="w-full lg:w-3/4 flex-shrink-0">
                <div
                  ref={videoContainerRef}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative"
                >
                  <VideoPlayerWithChapters
                    ref={playerRef}
                    src={streamingUrls.hls}
                    poster={streamingUrls.thumbnail}
                    title={video.title}
                    chapters={chapters}
                    videoDuration={video.duration_sec || undefined}
                    onReady={handlePlayerReady}
                    onError={handlePlayerError}
                    muted={true}
                    controls={true}
                    fluid={true}
                    className="w-full"
                  />

                  {/* Mobile Chapters Toggle Button */}
                  {chapters.length > 0 && (
                    <button
                      onClick={handleMobileChaptersToggle}
                      className="lg:hidden absolute bottom-4 right-4 bg-black/70 text-white p-3 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <List className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chapters Sidebar - 25% on desktop, hidden on mobile */}
              {chapters.length > 0 && (
                <div
                  ref={chaptersSidebarRef}
                  className="hidden lg:flex w-1/4 flex-shrink-0"
                >
                  <ChaptersSidebar
                    chapters={chapters}
                    onChapterClick={handleChapterClick}
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            {/* Video Metadata */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* Title and Description */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {video.title}
                  </h1>

                  {video.description && (
                    <p className="text-gray-700 text-lg leading-relaxed mb-6">
                      {video.description}
                    </p>
                  )}

                  {/* Video Stats */}
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                    {video.duration_sec && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-blue-600" />
                        {formatVideoDuration(video.duration_sec)}
                      </div>
                    )}

                    {video.created_at && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                        {formatUploadDate(video.created_at)}
                      </div>
                    )}

                    {video.size_bytes && (
                      <div className="text-gray-500">
                        {(video.size_bytes / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 lg:flex-col">
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center bg-white text-gray-700 border-2 border-gray-200 px-4 py-2 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>

                  <Link
                    href="/videos"
                    className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Library
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile Chapters Bottom Sheet */}
            {chapters.length > 0 && (
              <ChaptersBottomSheet
                chapters={chapters}
                isOpen={isMobileChaptersOpen}
                onClose={() => setIsMobileChaptersOpen(false)}
                onChapterClick={handleChapterClick}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
