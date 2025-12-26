import {
  MAX_CHAPTERS,
  MIN_CHAPTER_DURATION,
  MAX_CHAPTER_TITLE_LENGTH,
} from "@/lib/constants/upload";
import type { Chapter, ChapterValidationError } from "@/types";

/**
 * Parse timestamp string to seconds
 * Supports formats: MM:SS, HH:MM:SS, M:SS, H:MM:SS
 */
export function parseTimestampToSeconds(timestamp: string): number {
  const cleanTimestamp = timestamp.trim();

  // Match MM:SS or HH:MM:SS formats
  const timeRegex = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/;
  const match = cleanTimestamp.match(timeRegex);

  if (!match) {
    throw new Error(`Invalid timestamp format: ${timestamp}`);
  }

  const [, first, second, third] = match;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (third !== undefined) {
    // HH:MM:SS format
    hours = parseInt(first, 10);
    minutes = parseInt(second, 10);
    seconds = parseInt(third, 10);
  } else {
    // MM:SS format
    minutes = parseInt(first, 10);
    seconds = parseInt(second, 10);
  }

  // Validate ranges
  if (minutes >= 60 || seconds >= 60) {
    throw new Error(`Invalid time values in timestamp: ${timestamp}`);
  }

  if (hours >= 24) {
    throw new Error(`Hours cannot exceed 23 in timestamp: ${timestamp}`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse chapters from text input
 * Format: "MM:SS Chapter Title" or "HH:MM:SS Chapter Title"
 */
export function parseChaptersFromText(chaptersText: string): {
  chapters: Chapter[];
  errors: ChapterValidationError[];
} {
  const lines = chaptersText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const chapters: Chapter[] = [];
  const errors: ChapterValidationError[] = [];

  if (lines.length === 0) {
    return { chapters: [], errors: [] };
  }

  // Check maximum chapters limit
  if (lines.length > MAX_CHAPTERS) {
    errors.push({
      line: lines.length,
      error: `Maximum ${MAX_CHAPTERS} chapters allowed. You have ${lines.length} chapters.`,
      rawLine: "",
    });
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    try {
      // Parse line format: "timestamp title"
      const spaceIndex = line.indexOf(" ");

      if (spaceIndex === -1) {
        errors.push({
          line: lineNumber,
          error: "Missing chapter title after timestamp",
          rawLine: line,
        });
        return;
      }

      const timestamp = line.substring(0, spaceIndex).trim();
      const title = line.substring(spaceIndex + 1).trim();

      // Validate timestamp
      let start_seconds: number;
      try {
        start_seconds = parseTimestampToSeconds(timestamp);
      } catch (timestampError) {
        errors.push({
          line: lineNumber,
          error:
            timestampError instanceof Error
              ? timestampError.message
              : "Invalid timestamp",
          rawLine: line,
        });
        return;
      }

      // Validate title
      if (!title || title.length === 0) {
        errors.push({
          line: lineNumber,
          error: "Chapter title cannot be empty",
          rawLine: line,
        });
        return;
      }

      if (title.length > MAX_CHAPTER_TITLE_LENGTH) {
        errors.push({
          line: lineNumber,
          error: `Chapter title must be less than ${MAX_CHAPTER_TITLE_LENGTH} characters`,
          rawLine: line,
        });
        return;
      }

      // Sanitize chapter title to prevent XSS
      const sanitizedTitle = title
        .replace(/[<>"'&]/g, (char) => {
          const entities: Record<string, string> = {
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "&": "&amp;",
          };
          return entities[char] || char;
        })
        .trim();

      chapters.push({
        title: sanitizedTitle,
        timestamp,
        start_seconds,
      });
    } catch (error) {
      errors.push({
        line: lineNumber,
        error: error instanceof Error ? error.message : "Unknown parsing error",
        rawLine: line,
      });
    }
  });

  // Sort chapters by start_seconds
  chapters.sort((a, b) => a.start_seconds - b.start_seconds);

  // Validate chapter ordering and duplicates
  const usedTimestamps = new Set<number>();

  chapters.forEach((chapter, index) => {
    // Check for duplicate timestamps
    if (usedTimestamps.has(chapter.start_seconds)) {
      const duplicateLine =
        lines.findIndex((line) => line.includes(chapter.timestamp)) + 1;
      errors.push({
        line: duplicateLine,
        error: `Duplicate timestamp: ${chapter.timestamp}`,
        rawLine: lines[duplicateLine - 1],
      });
      return;
    }
    usedTimestamps.add(chapter.start_seconds);

    // Check minimum duration between chapters
    if (index > 0) {
      const previousChapter = chapters[index - 1];
      const duration = chapter.start_seconds - previousChapter.start_seconds;

      if (duration < MIN_CHAPTER_DURATION) {
        const chapterLine =
          lines.findIndex((line) => line.includes(chapter.timestamp)) + 1;
        errors.push({
          line: chapterLine,
          error: `Chapter must be at least ${MIN_CHAPTER_DURATION} seconds after previous chapter`,
          rawLine: lines[chapterLine - 1],
        });
      }
    }
  });

  // Validate first chapter starts at 00:00 if chapters exist
  if (chapters.length > 0 && chapters[0].start_seconds !== 0) {
    const firstLine =
      lines.findIndex((line) => line.includes(chapters[0].timestamp)) + 1;
    errors.push({
      line: firstLine,
      error: "First chapter must start at 00:00",
      rawLine: lines[firstLine - 1],
    });
  }

  // Ensure at least 2 chapters if any chapters provided (more practical than 3)
  if (chapters.length === 1) {
    errors.push({
      line: 1,
      error:
        "At least 2 chapters required if using chapters. For a single chapter, consider not using chapters.",
      rawLine: "",
    });
  }

  return { chapters, errors };
}

/**
 * Generate example chapters text for placeholder
 */
export function getExampleChaptersText(): string {
  return `00:00 Introduction
01:30 Getting Started
05:45 Main Content
12:20 Advanced Topics
18:10 Conclusion`;
}
