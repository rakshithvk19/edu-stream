import type { FieldError } from "react-hook-form";

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

export interface ChaptersSidebarProps {
  chapters: Chapter[];
  currentTime?: number;
  onChapterClick: (chapter: Chapter) => void;
  className?: string;
}

export interface ChaptersBottomSheetProps {
  chapters: Chapter[];
  isOpen: boolean;
  onClose: () => void;
  onChapterClick: (chapter: Chapter) => void;
  className?: string;
}

export interface Chapter {
  title: string;
  timestamp: string;
  start_seconds: number;
}

export interface ChapterValidationError {
  line: number;
  error: string;
  rawLine: string;
}
