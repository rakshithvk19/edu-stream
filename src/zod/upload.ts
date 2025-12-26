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

// Chapter validation schema
export const chapterSchema = z.object({
  title: z.string().min(1).max(MAX_CHAPTER_TITLE_LENGTH),
  timestamp: z.string().min(1),
  start_seconds: z.number().min(0),
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

// File validation schema
export const fileValidationSchema = z.object({
  name: z.string().min(1, "Filename is required"),
  size: z
    .number()
    .min(1, "File cannot be empty")
    .max(MAX_FILE_SIZE, "File size must be less than 3GB"),
  type: z
    .string()
    .refine((type) => SUPPORTED_VIDEO_TYPES.includes(type as typeof SUPPORTED_VIDEO_TYPES[number]), {
    message:
    "File must be a supported video format (MP4, MOV, AVI, WMV, FLV, WebM, MKV, etc.)",
    }),
  lastModified: z.number().optional(),
});

// Upload form data schema
export const uploadFormSchema = z.object({
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
    .string()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .trim()
    .optional()
    .transform((desc) => (desc ? desc.replace(/\s+/g, " ") : "")), // Normalize whitespace

  file: fileValidationSchema,
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

// API request schema (server-side)
export const createUploadRequestSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).trim(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  fileSize: z.number().min(1).max(MAX_FILE_SIZE),
  fileType: z
    .string()
    .refine((type) => SUPPORTED_VIDEO_TYPES.includes(type as typeof SUPPORTED_VIDEO_TYPES[number])),
  chapters: chaptersTextSchema,
});

// Type exports (derived from schemas)
export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type ReactHookFormData = z.infer<typeof reactHookFormSchema>;
export type FileValidationData = z.infer<typeof fileValidationSchema>;
export type CreateUploadRequest = z.infer<typeof createUploadRequestSchema>;
export type TusMetadata = z.infer<typeof tusMetadataSchema>;
