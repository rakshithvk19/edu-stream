"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Clock, Calendar } from "lucide-react";
import { formatVideoDuration } from "@/services/VideoStreamingService";
import type { VideoCardProps } from "@/types/components/video-grid";

export default function VideoCard({ video }: VideoCardProps) {
  const thumbnailUrl = `https://videodelivery.net/${video.cloudflare_video_id}/thumbnails/thumbnail.jpg`;

  // Format upload date
  const formatUploadDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={`group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 `}
    >
      <Link href={`/videos/${video.cloudflare_video_id}`}>
        {/* Thumbnail Container */}
        <div className="relative aspect-video bg-gray-100 overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Fallback to a placeholder if thumbnail fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";

              // Create a fallback div
              const fallback = document.createElement("div");
              fallback.className =
                "absolute inset-0 bg-gray-100 flex items-center justify-center";
              fallback.innerHTML = `
                <div class="text-center text-gray-400">
                  <svg class="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 2l3 3 4-4 3 3v4H8v-6z"/>
                  </svg>
                  <p class="text-sm">No Thumbnail</p>
                </div>
              `;

              target.parentElement?.appendChild(fallback);
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
          <h3
            className="font-semibold text-gray-900 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {video.title}
          </h3>

          {video.description && (
            <p
              className="text-gray-600 text-sm leading-relaxed mb-3 overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
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
