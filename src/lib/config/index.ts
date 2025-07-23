import { env } from './env';

// Application configuration
export const config = {
  // Environment
  env: {
    NODE_ENV: env.NODE_ENV,
    VERCEL_ENV: env.VERCEL_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },

  // Supabase configuration
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Cloudflare Stream configuration
  cloudflare: {
    apiToken: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    webhookSecret: env.CLOUDFLARE_STREAM_WEBHOOK_SECRET,
    baseUrl: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`,
    streamUrl: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`,
  },

  // CORS configuration
  cors: {
    allowedOrigins: env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] // Replace with actual production domains
      : ['*'], // Allow all origins in development
    allowedMethods: ['GET', 'POST', 'PATCH', 'HEAD', 'OPTIONS', 'DELETE'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100, // Global limit
    message: 'Too many requests. Please try again later.',
  },

  // Upload configuration
  upload: {
    maxFileSize: 3 * 1024 * 1024 * 1024, // 3GB
    chunkSize: 50 * 1024 * 1024, // 50MB
    maxDurationSeconds: 3600, // 1 hour
    allowedMimeTypes: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      'video/3gpp',
      'video/x-matroska',
    ],
  },

  // TUS protocol configuration
  tus: {
    version: '1.0.0',
    extensions: ['creation', 'expiration'],
    retryDelays: [0, 3000, 5000, 10000, 20000],
  },
} as const;

// Export types
export type Config = typeof config;
export type CorsConfig = typeof config.cors;
export type RateLimitConfig = typeof config.rateLimit;
