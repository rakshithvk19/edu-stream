// Video.js doesn't export named types in the standard way
// We'll use the default import and access Player through the namespace

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  onReady?: (player: any) => void; // Using any for now since Video.js types can be tricky
  onError?: (error: string) => void;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fluid?: boolean;
  width?: number;
  height?: number;
}

export interface VideoPlayerRef {
  player: any | null; // Using any for now
  play: () => void;
  pause: () => void;
  dispose: () => void;
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
