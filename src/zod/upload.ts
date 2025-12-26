import { z } from "zod";
import {
  MAX_FILE_SIZE,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  SUPPORTED_VIDEO_TYPES,
  MAX_CHAPTER_TITLE_LENGTH,
} from "@/lib/constants/upload";
import { parseChaptersFromText } from "@/lib/utils/chapters";

// File validation schema for native File objects (React Hook Form)
export const nativeFileValidationSchema = z
  .instanceof(File)
  .refine((file) => {
    return file.size > 0;
  }, "File cannot be empty")
  .refine((file) => {
    return file.size <= MAX_FILE_SIZE;
  }, "File size must be less than 3GB")
  .refine((file) => {
    const isSupported = SUPPORTED_VIDEO_TYPES.includes(file.type as typeof SUPPORTED_VIDEO_TYPES[number]);
    return isSupported;
  }, {
    message:
      "File must be a supported video format (MP4, MOV, AVI, WMV, FLV, WebM, MKV, etc.)",
  });

// Chapters text validation (parses and validates the text input)
export const chaptersTextSchema = z
  .string()
  .default("")
  .transform((text) => text.trim())
  .refine(
    (text) => {
      if (!text || text === "") return true; // Empty chapters are allowed
      const { errors } = parseChaptersFromText(text);
      return errors.length === 0;
    },
    (text) => {
      if (!text || text === "") return { message: "Chapters are optional" };
      const { errors } = parseChaptersFromText(text);
      const firstError = errors[0];
      return {
        message: firstError ? `Line ${firstError.line}: ${firstError.error}` : "Invalid chapters format",
      };
    }
  );

// React Hook Form schema (uses native File objects)
export const reactHookFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be less than ${MAX_TITLE_LENGTH} characters`
    )
    .trim()
    .transform((title) => title.replace(/\s+/g, " ")), // Normalize whitespace

  description: z
    .union([
      z.literal(""),
      z
        .string()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`
        )
        .trim()
        .transform((desc) => desc.replace(/\s+/g, " ")),
    ])
    .transform((val) => (val === "" ? "" : val)),

  file: z.any().superRefine((val, ctx) => {
    // Then delegate to the actual validator
    const result = nativeFileValidationSchema.safeParse(val);
    
    if (!result.success) {
      result.error.issues.forEach(issue => {
        ctx.addIssue(issue);
      });
    }
  }),
  
  chapters: chaptersTextSchema,
});

// TUS metadata schema (for server-side validation)
export const tusMetadataSchema = z.object({
  filename: z.string().min(1),
  filetype: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  chapters: z.string().default(""),
});


