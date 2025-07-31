import { z } from "zod";
import {
  MAX_FILE_SIZE,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  SUPPORTED_VIDEO_TYPES,
} from "@/lib/constants/upload";

// File validation schema for native File objects (React Hook Form)
export const nativeFileValidationSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "File cannot be empty")
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    "File size must be less than 3GB"
  )
  .refine((file) => SUPPORTED_VIDEO_TYPES.includes(file.type as any), {
    message:
      "File must be a supported video format (MP4, MOV, AVI, WMV, FLV, WebM, MKV, etc.)",
  });

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

  file: nativeFileValidationSchema,
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
    .refine((type) => SUPPORTED_VIDEO_TYPES.includes(type as any), {
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
});

// TUS metadata schema (for server-side validation)
export const tusMetadataSchema = z.object({
  filename: z.string().min(1),
  filetype: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

// API request schema (server-side)
export const createUploadRequestSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH).trim(),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  fileSize: z.number().min(1).max(MAX_FILE_SIZE),
  fileType: z
    .string()
    .refine((type) => SUPPORTED_VIDEO_TYPES.includes(type as any)),
});

// Type exports (derived from schemas)
export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type ReactHookFormData = z.infer<typeof reactHookFormSchema>;
export type FileValidationData = z.infer<typeof fileValidationSchema>;
export type CreateUploadRequest = z.infer<typeof createUploadRequestSchema>;
export type TusMetadata = z.infer<typeof tusMetadataSchema>;
