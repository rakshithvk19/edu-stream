"use client";
import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import videojs from "video.js";
import "@videojs/http-streaming";
import type {
  VideoPlayerProps,
  VideoPlayerRef,
} from "@/types/components/video-player";
import type Player from "video.js/dist/types/player";

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      src,
      poster,
      title,
      className = "",
      onReady,
      onError,
      autoplay = false,
      muted = true, // Default to muted for autoplay compliance
      controls = true,
      fluid = true,
      width = 640,
      height = 360,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
      player: playerRef.current,
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      dispose: () => {
        if (playerRef.current && !playerRef.current.isDisposed()) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
      },
    }));

    useEffect(() => {
      // Make sure Video.js player is only initialized once
      if (!playerRef.current && videoRef.current) {
        // Create video element
        const videoElement = document.createElement("video");
        videoElement.classList.add("video-js", "vjs-big-play-centered");
        videoElement.setAttribute("data-testid", "video-player");

        if (title) {
          videoElement.setAttribute("title", title);
        }

        videoRef.current.appendChild(videoElement);

        // Video.js configuration
        const options: any = {
          controls,
          fluid,
          responsive: true,
          autoplay: autoplay ? (muted ? "muted" : true) : false,
          muted,
          preload: "metadata",
          sources: [
            {
              src,
              type: "application/x-mpegURL", // HLS MIME type
            },
          ],
          poster,
          html5: {
            hls: {
              enableLowInitialPlaylist: true,
              smoothQualityChange: true,
              overrideNative: true,
            },
          },
          playbackRates: [0.5, 1, 1.25, 1.5, 2], // Speed control options
        };

        // Initialize Video.js player
        const player = (playerRef.current = videojs(
          videoElement,
          options,
          () => {
            onReady?.(player);

            // Handle HLS-specific events if available
            const tech = player.tech(true);
            if (tech && "hls" in tech) {
              const hlsHandler = (
                tech as unknown as {
                  hls: {
                    on: (
                      event: string,
                      callback: (event: unknown, data: { type: string }) => void
                    ) => void;
                  };
                }
              ).hls;
              if (hlsHandler) {
                hlsHandler.on(
                  "error",
                  (_event: unknown, data: { type: string }) => {
                    onError?.(`HLS streaming error: ${data.type}`);
                  }
                );
              }
            }
          }
        ));

        // Handle errors
        player.on("error", () => {
          const error = player.error();
          const errorMessage = error?.message || "Video playback error";
          onError?.(errorMessage);
        });
      }
    }, [
      src,
      poster,
      title,
      onReady,
      onError,
      autoplay,
      muted,
      controls,
      fluid,
    ]);

    // Cleanup on unmount
    useEffect(() => {
      const player = playerRef.current;

      return () => {
        if (player && !player.isDisposed()) {
          player.dispose();
          playerRef.current = null;
        }
      };
    }, []);

    // Update source when it changes
    useEffect(() => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.src({
          src,
          type: "application/x-mpegURL",
        });

        if (poster) {
          player.poster(poster);
        }
      }
    }, [src, poster]);

    return (
      <div className={`video-player-wrapper ${className}`}>
        <div
          ref={videoRef}
          className="video-js-container"
          style={{
            width: fluid ? "100%" : width,
            height: fluid ? "auto" : height,
          }}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
