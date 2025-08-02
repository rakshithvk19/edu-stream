"use client";
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import VideoPlayer from './VideoPlayer';
import type { VideoPlayerProps, VideoPlayerRef } from '@/types/components/video-player';
import type { Chapter } from '@/lib/utils/chapters';

interface VideoPlayerWithChaptersProps extends VideoPlayerProps {
  chapters?: Chapter[];
  onChapterChange?: (chapter: Chapter | null) => void;
  videoDuration?: number;
}

interface VideoPlayerWithChaptersRef extends VideoPlayerRef {
  seekToChapter: (chapter: Chapter) => void;
  seekToTime: (seconds: number) => void;
}

const VideoPlayerWithChapters = forwardRef<VideoPlayerWithChaptersRef, VideoPlayerWithChaptersProps>(({
  chapters = [],
  onChapterChange,
  videoDuration,
  onReady,
  ...videoPlayerProps
}, ref) => {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const markersAddedRef = useRef(false);

  // Expose enhanced methods through ref
  useImperativeHandle(ref, () => ({
    ...videoPlayerRef.current!,
    seekToChapter: (chapter: Chapter) => {
      const player = videoPlayerRef.current?.player;
      if (player && !player.isDisposed()) {
        player.currentTime(chapter.start_seconds);
        if (player.paused()) {
          player.play();
        }
      }
    },
    seekToTime: (seconds: number) => {
      const player = videoPlayerRef.current?.player;
      if (player && !player.isDisposed()) {
        player.currentTime(seconds);
      }
    },
  }));

  // Add chapter markers to Video.js progress bar
  const addChapterMarkers = (player: any) => {
    if (!chapters.length || !videoDuration || markersAddedRef.current) return;

    try {
      const progressControl = player.controlBar?.progressControl;
      if (!progressControl) return;

      const seekBar = progressControl.seekBar;
      if (!seekBar) return;

      // Remove existing markers
      const existingMarkers = seekBar.el().querySelectorAll('.chapter-marker');
      existingMarkers.forEach((marker: Element) => marker.remove());

      // Add new markers
      chapters.forEach((chapter, index) => {
        const position = (chapter.start_seconds / videoDuration) * 100;
        
        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'chapter-marker';
        marker.style.cssText = `
          position: absolute;
          left: ${position}%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: #2563eb;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // Hover effects
        marker.addEventListener('mouseenter', () => {
          marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
          marker.style.backgroundColor = '#1d4ed8';
          
          // Create tooltip
          const tooltip = document.createElement('div');
          tooltip.className = 'chapter-tooltip';
          tooltip.innerHTML = `${chapter.timestamp} - ${chapter.title}`;
          tooltip.style.cssText = `
            position: absolute;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
            max-width: 200px;
            text-overflow: ellipsis;
            overflow: hidden;
          `;
          
          // Add arrow
          const arrow = document.createElement('div');
          arrow.style.cssText = `
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid rgba(0, 0, 0, 0.9);
          `;
          tooltip.appendChild(arrow);
          
          marker.appendChild(tooltip);
        });

        marker.addEventListener('mouseleave', () => {
          marker.style.transform = 'translate(-50%, -50%) scale(1)';
          marker.style.backgroundColor = '#2563eb';
          
          // Remove tooltip
          const tooltip = marker.querySelector('.chapter-tooltip');
          if (tooltip) {
            tooltip.remove();
          }
        });

        // Click to jump to chapter
        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          player.currentTime(chapter.start_seconds);
          if (player.paused()) {
            player.play();
          }
        });

        // Add marker to seek bar
        seekBar.el().appendChild(marker);
      });

      markersAddedRef.current = true;
    } catch (error) {
      console.error('Failed to add chapter markers:', error);
    }
  };

  // Handle player ready event
  const handlePlayerReady = (player: any) => {
    // Add chapter markers once player is ready and we have duration
    if (chapters.length > 0 && videoDuration) {
      // Small delay to ensure DOM is ready
      setTimeout(() => addChapterMarkers(player), 100);
    }

    // Call original onReady callback
    onReady?.(player);
  };

  // Re-add markers when chapters or duration change
  useEffect(() => {
    const player = videoPlayerRef.current?.player;
    if (player && !player.isDisposed() && chapters.length > 0 && videoDuration) {
      markersAddedRef.current = false;
      addChapterMarkers(player);
    }
  }, [chapters, videoDuration]);

  return (
    <VideoPlayer
      ref={videoPlayerRef}
      {...videoPlayerProps}
      onReady={handlePlayerReady}
    />
  );
});

VideoPlayerWithChapters.displayName = 'VideoPlayerWithChapters';

export default VideoPlayerWithChapters;
export type { VideoPlayerWithChaptersRef };