import { NextResponse } from 'next/server';
import type { CorsConfig } from '@/lib/config';

/**
 * Create CORS headers based on configuration
 */
export function createCorsHeaders(corsConfig: CorsConfig): Record<string, string> {
  const origin = corsConfig.allowedOrigins.includes('*') 
    ? '*' 
    : corsConfig.allowedOrigins.join(',');

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': corsConfig.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': corsConfig.exposedHeaders.join(', '),
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(corsConfig: CorsConfig): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: createCorsHeaders(corsConfig),
  });
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: NextResponse, corsConfig: CorsConfig): NextResponse {
  const corsHeaders = createCorsHeaders(corsConfig);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null, corsConfig: CorsConfig): boolean {
  if (!origin) return true; // Allow requests without origin (same-origin, mobile apps, etc.)
  if (corsConfig.allowedOrigins.includes('*')) return true;
  
  return corsConfig.allowedOrigins.some(allowedOrigin => {
    // Support wildcard subdomains like *.example.com
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.slice(2);
      return origin.endsWith(domain);
    }
    return origin === allowedOrigin;
  });
}
