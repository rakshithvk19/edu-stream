import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  
  // Cloudflare
  CLOUDFLARE_API_TOKEN: z.string().min(1, "CLOUDFLARE_API_TOKEN is required"),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, "CLOUDFLARE_ACCOUNT_ID is required"),
  CLOUDFLARE_STREAM_WEBHOOK_SECRET: z.string().optional(),
  
  // Next.js
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      
      throw new Error(`Environment validation failed:\n${errorMessage}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type for validated environment
export type ValidatedEnv = z.infer<typeof envSchema>;
