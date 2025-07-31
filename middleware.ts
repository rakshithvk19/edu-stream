import { NextRequest, NextResponse } from 'next/server';
import { 
  MAX_FILE_SIZE, 
  CHUNK_SIZE,
  CORS_ALLOWED_METHODS,
  CORS_ALLOWED_HEADERS,
  CORS_EXPOSED_HEADERS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_MESSAGE
} from './src/lib/constants/upload';

// Interfaces
interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Helper functions
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getCorsAllowedOrigins(): string[] {
  return isProduction() 
    ? ['https://your-domain.com'] // Replace with actual production domains
    : ['*']; // Allow all origins in development
}

function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for');
  
  return forwardedFor?.split(',')[0] || realIp || remoteAddr || 'unknown';
}

function isRateLimited(clientId: string): RateLimitResult {
  const now = Date.now();
  const key = `ratelimit:${clientId}`;
  
  let data = rateLimitStore.get(key);
  
  if (!data || now >= data.resetTime) {
    data = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }
  
  data.count++;
  rateLimitStore.set(key, data);
  
  const isLimited = data.count > RATE_LIMIT_MAX_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - data.count);
  
  return {
    isLimited,
    remaining,
    resetTime: data.resetTime,
  };
}

function createCorsHeaders(): Record<string, string> {
  const allowedOrigins = getCorsAllowedOrigins();
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes('*') ? '*' : allowedOrigins.join(','),
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS.join(','),
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS.join(','),
    'Access-Control-Expose-Headers': CORS_EXPOSED_HEADERS.join(','),
    'Access-Control-Allow-Credentials': 'true',
  };
}

function createRateLimitHeaders(remaining: number, resetTime: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };
}

/**
 * Next.js Edge Middleware
 * Handles CORS, rate limiting, and basic request validation
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  try {
    // 1. CORS handling
    const requestOrigin = request.headers.get('origin');
    const allowedOrigins = getCorsAllowedOrigins();
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      const corsHeaders = createCorsHeaders();
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Check if origin is allowed (in production)
    if (isProduction() && requestOrigin && !allowedOrigins.includes('*') && !allowedOrigins.includes(requestOrigin)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Origin not allowed' },
        { status: 403 }
      );
    }

    // 2. Rate limiting (global)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = isRateLimited(clientId);

    if (rateLimitResult.isLimited) {
      const response = NextResponse.json(
        { error: 'RATE_LIMITED', message: RATE_LIMIT_MESSAGE },
        { status: 429 }
      );
      
      // Add rate limit headers
      const rateLimitHeaders = createRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    // 3. Basic request validation
    // Validate Content-Length for upload requests
    if (pathname.startsWith('/api/tus-upload') && (method === 'POST' || method === 'PATCH')) {
      const contentLength = request.headers.get('content-length');
      
      if (method === 'POST') {
        // For TUS initialization, check Upload-Length header
        const uploadLength = request.headers.get('upload-length');
        if (uploadLength) {
          const length = parseInt(uploadLength, 10);
          if (length > MAX_FILE_SIZE) {
            return NextResponse.json(
              { 
                error: 'FILE_TOO_LARGE', 
                message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes` 
              },
              { status: 413 }
            );
          }
        }
      }

      if (method === 'PATCH' && contentLength) {
        const length = parseInt(contentLength, 10);
        if (length > CHUNK_SIZE) {
          return NextResponse.json(
            { 
              error: 'CHUNK_TOO_LARGE', 
              message: `Chunk size exceeds maximum allowed size of ${CHUNK_SIZE} bytes` 
            },
            { status: 413 }
          );
        }
      }
    }

    // 4. Method validation for specific routes
    const routeMethodMap: Record<string, string[]> = {
      '/api/tus-upload': ['POST', 'OPTIONS'],
      '/api/webhooks/cloudflare-stream': ['POST', 'OPTIONS'],
    };

    // Check for specific route patterns
    for (const [route, allowedMethods] of Object.entries(routeMethodMap)) {
      if (pathname === route && !allowedMethods.includes(method)) {
        const response = NextResponse.json(
          { error: 'METHOD_NOT_ALLOWED', message: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}` },
          { status: 405 }
        );
        response.headers.set('Allow', allowedMethods.join(', '));
        return response;
      }
    }

    // Dynamic route patterns
    if (pathname.match(/^\/api\/tus-upload\/[^\/]+$/)) {
      const allowedMethods = ['PATCH', 'HEAD', 'GET', 'OPTIONS'];
      if (!allowedMethods.includes(method)) {
        const response = NextResponse.json(
          { error: 'METHOD_NOT_ALLOWED', message: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}` },
          { status: 405 }
        );
        response.headers.set('Allow', allowedMethods.join(', '));
        return response;
      }
    }

    // 5. Create response and add headers
    const response = NextResponse.next();

    // Add CORS headers to all responses
    const corsHeaders = createCorsHeaders();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add rate limit headers to all responses
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetTime);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // Return a generic error response
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
