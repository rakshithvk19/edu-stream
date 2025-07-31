import type { VideoRecord } from '@/repositories/VideoRepository';

export interface VideoCardProps {
  video: VideoRecord;
  onClick?: (video: VideoRecord) => void;
  className?: string;
}

export interface VideoGridProps {
  videos: VideoRecord[];
  loading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export interface VideoGridSkeletonProps {
  count?: number;
  className?: string;
}

export interface VideoSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface VideoGridPageState {
  videos: VideoRecord[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  searchQuery: string;
}
