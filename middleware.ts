import { NextRequest, NextResponse } from 'next/server';
import { config } from './src/lib/config';
import { 
  createCorsHeaders, 
  handleCorsPreflightRequest, 
  isOriginAllowed 
} from './src/lib/middleware/cors';
import { 
  getClientIdentifier, 
  isRateLimited, 
  createRateLimitHeaders 
} from './src/lib/middleware/rateLimit';
import { 
  handleRateLimitError,
  handleMethodNotAllowedError 
} from './src/lib/middleware/errors';

/**
 * Next.js Edge Middleware
 * Handles CORS, rate limiting, and basic request validation
 */
export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const method = request.method;

  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  try {
    // 1. CORS handling
    const requestOrigin = request.headers.get('origin');
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return handleCorsPreflightRequest(config.cors);
    }

    // Check if origin is allowed (in production)
    if (config.env.isProduction && requestOrigin && !isOriginAllowed(requestOrigin, config.cors)) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Origin not allowed' },
        { status: 403 }
      );
    }

    // 2. Rate limiting (global)
    const clientId = getClientIdentifier(request);
    const rateLimitResult = isRateLimited(clientId, config.rateLimit);

    if (rateLimitResult.isLimited) {
      const response = handleRateLimitError(config.rateLimit.message, rateLimitResult.resetTime);
      
      // Add rate limit headers
      const rateLimitHeaders = createRateLimitHeaders(
        rateLimitResult.remaining,
        rateLimitResult.resetTime,
        config.rateLimit.maxRequests
      );

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
          if (length > config.upload.maxFileSize) {
            return NextResponse.json(
              { 
                error: 'FILE_TOO_LARGE', 
                message: `File size exceeds maximum allowed size of ${config.upload.maxFileSize} bytes` 
              },
              { status: 413 }
            );
          }
        }
      }

      if (method === 'PATCH' && contentLength) {
        const length = parseInt(contentLength, 10);
        if (length > config.upload.chunkSize) {
          return NextResponse.json(
            { 
              error: 'CHUNK_TOO_LARGE', 
              message: `Chunk size exceeds maximum allowed size of ${config.upload.chunkSize} bytes` 
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
        return handleMethodNotAllowedError(allowedMethods);
      }
    }

    // Dynamic route patterns
    if (pathname.match(/^\/api\/tus-upload\/[^\/]+$/)) {
      const allowedMethods = ['PATCH', 'HEAD', 'GET', 'OPTIONS'];
      if (!allowedMethods.includes(method)) {
        return handleMethodNotAllowedError(allowedMethods);
      }
    }

    // 5. Create response and add headers
    const response = NextResponse.next();

    // Add CORS headers to all responses
    const corsHeaders = createCorsHeaders(config.cors);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add rate limit headers to all responses
    const rateLimitHeaders = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      config.rateLimit.maxRequests
    );

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
export const config_middleware = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
