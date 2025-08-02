import type { FieldError } from 'react-hook-form';
import type { Chapter, ChapterValidationError } from '@/lib/utils/chapters';

// Component prop types for chapter input
export interface ChapterInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: FieldError;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Chapter validation state
export interface ChapterValidationState {
  isValid: boolean;
  errors: ChapterValidationError[];
  chapters: Chapter[];
  hasChapters: boolean;
}

// Chapter sidebar component props
export interface ChaptersSidebarProps {
  chapters: Chapter[];
  currentTime?: number;
  onChapterClick: (chapter: Chapter) => void;
  className?: string;
}

// Chapter bottom sheet component props
export interface ChaptersBottomSheetProps {
  chapters: Chapter[];
  isOpen: boolean;
  onClose: () => void;
  onChapterClick: (chapter: Chapter) => void;
  className?: string;
}
