import { z } from "zod";

/**
 * Error formatting helper for Zod errors
 */
export const formatZodError = (error: z.ZodError): Record<string, string> => {
  return error.issues.reduce<Record<string, string>>(
    (acc: Record<string, string>, curr) => {
      const field = curr.path.join(".");
      acc[field] = curr.message;
      return acc;
    },
    {}
  );
};

/**
 * Safely parse data with Zod schema and return result
 */
export function safeParseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format errors for easy consumption
  const errors = result.error.issues.reduce<Record<string, string>>(
    (acc: Record<string, string>, curr) => {
      const field = curr.path.join(".");
      acc[field] = curr.message;
      return acc;
    },
    {}
  );

  return { success: false, errors };
}

/**
 * Validate File object against schema
 */
export async function validateFile(
  file: File | null
): Promise<
  | { success: true; data: File }
  | { success: false; errors: Record<string, string> }
> {
  if (!file) {
    return { success: false, errors: { file: "File is required" } };
  }

  // Convert File to plain object for Zod validation
  const fileData = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };

  const { fileValidationSchema } = await import("@/zod/schemas/upload");
  const result = safeParseWithSchema(fileValidationSchema, fileData);

  if (result.success) {
    return { success: true, data: file };
  }

  return result;
}
