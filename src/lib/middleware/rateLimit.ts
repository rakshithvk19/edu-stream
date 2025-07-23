import type { RateLimitConfig } from '@/lib/config';

// In-memory store for rate limiting (for POC)
// In production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Check if request should be rate limited
 */
export function isRateLimited(clientId: string, config: RateLimitConfig): {
  isLimited: boolean;
  resetTime: number;
  remaining: number;
} {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up expired entries
  cleanupExpiredEntries(windowStart);
  
  const entry = rateLimitStore.get(clientId);
  
  if (!entry) {
    // First request from this client
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    
    return {
      isLimited: false,
      resetTime: now + config.windowMs,
      remaining: config.maxRequests - 1,
    };
  }
  
  // Check if the window has expired
  if (now >= entry.resetTime) {
    // Reset the counter
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    
    return {
      isLimited: false,
      resetTime: now + config.windowMs,
      remaining: config.maxRequests - 1,
    };
  }
  
  // Increment counter
  entry.count++;
  
  const isLimited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  return {
    isLimited,
    resetTime: entry.resetTime,
    remaining,
  };
}

/**
 * Create rate limit headers
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries(cutoffTime: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < cutoffTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get current rate limit stats for a client
 */
export function getRateLimitStats(clientId: string, config: RateLimitConfig): {
  requests: number;
  remaining: number;
  resetTime: number;
} {
  const entry = rateLimitStore.get(clientId);
  
  if (!entry) {
    return {
      requests: 0,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }
  
  return {
    requests: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}
