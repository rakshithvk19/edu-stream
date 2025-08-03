// Video.js doesn't export named types in the standard way
// We'll use the default import and access Player through the namespace

import videojs from 'video.js';
import type { Chapter } from '@/lib/utils/chapters';

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  onReady?: (player: videojs.Player) => void; // Using Video.js types
  onError?: (error: string) => void;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fluid?: boolean;
  width?: number;
  height?: number;
}

export interface VideoPlayerRef {
  player: videojs.Player | null;
  play: () => void;
  pause: () => void;
  dispose: () => void;
}

// Enhanced video player props with chapter support
export interface VideoPlayerWithChaptersProps extends VideoPlayerProps {
  chapters?: Chapter[];
  onChapterChange?: (chapter: Chapter | null) => void;
  videoDuration?: number;
}

// Enhanced video player ref with chapter methods
export interface VideoPlayerWithChaptersRef extends VideoPlayerRef {
  seekToChapter: (chapter: Chapter) => void;
  seekToTime: (seconds: number) => void;
}

export interface VideoJsConfig {
  sources: Array<{
    src: string;
    type: string;
  }>;
  poster?: string;
  fluid?: boolean;
  responsive?: boolean;
  autoplay?: boolean | 'muted' | 'play' | 'any';
  muted?: boolean;
  controls?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  html5?: {
    hls?: {
      enableLowInitialPlaylist?: boolean;
      smoothQualityChange?: boolean;
      overrideNative?: boolean;
    };
  };
  playbackRates?: number[];
}
