import type { FieldError } from 'react-hook-form';

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
