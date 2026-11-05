import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}

const buckets = new Map<string, RateLimitBucket>();

// Periodic cleanup of expired rate-limit buckets so memory stays bounded
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 30 * 60 * 1000);
    if (bucket.timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this IP address. Please try again shortly.',
    keyPrefix = 'rl',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket?.remoteAddress || 'unknown';

    const key = `${keyPrefix}:${rawIp}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { timestamps: [] };

    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    const remaining = Math.max(0, maxRequests - bucket.timestamps.length);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining - 1)));

    if (bucket.timestamps.length >= maxRequests) {
      const oldestInWindow = bucket.timestamps[0] || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldestInWindow)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds,
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    next();
  };
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please wait a few minutes and try again.',
});

export const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'otp',
  message: 'Too many verification code requests. Please wait before trying again.',
});

export const contactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  keyPrefix: 'contact',
  message: 'Too many contact submissions from your network. Please wait a few minutes.',
});
