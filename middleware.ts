import { NextRequest, NextResponse } from 'next/server';
import { 
  MAX_FILE_SIZE, 
  CHUNK_SIZE,
} from './src/lib/constants/upload';

/**
 * Next.js Edge Middleware
 * Handles CORS, file size validation, and security headers
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, HEAD, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*',
      }
    });
  }

  // Validate file size for upload requests
  if (pathname.startsWith('/api/tus-upload') && (method === 'POST' || method === 'PATCH')) {
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

    if (method === 'PATCH') {
      const contentLength = request.headers.get('content-length');
      if (contentLength) {
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
  }

  // Create response and add headers
  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, HEAD, OPTIONS, DELETE');
  response.headers.set('Access-Control-Allow-Headers', '*');
  response.headers.set('Access-Control-Expose-Headers', '*');

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
