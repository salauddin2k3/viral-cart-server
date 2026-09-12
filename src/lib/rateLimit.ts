import { NextFunction, Request, Response } from 'express';
import { AppError } from '../types/api.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

function keyFromRequest(req: Request, keyPrefix: string): string {
  return `${keyPrefix}:${req.ip ?? 'unknown'}`;
}

export function createRateLimiter(config: RateLimitConfig, name: string) {
  const store = getStore(name);

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = keyFromRequest(req, name);
    const now = Date.now();
    const entry = store.get(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= config.max) {
        next(new AppError('RATE_LIMITED', 'Too many requests. Try again later.'));
        return;
      }
      entry.count += 1;
    } else {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
    }

    next();
  };
}

const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20 }, 'auth');
const autosaveLimiter = createRateLimiter({ windowMs: 3_000, max: 1 }, 'autosave');
const orderSubmitLimiter = createRateLimiter({ windowMs: 60_000, max: 5 }, 'order_submit');
const trackingLimiter = createRateLimiter({ windowMs: 60_000, max: 10 }, 'tracking');
const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 10 }, 'upload');

export const rateLimitRegistry = {
  auth: authLimiter,
  autosave: autosaveLimiter,
  orderSubmit: orderSubmitLimiter,
  tracking: trackingLimiter,
  upload: uploadLimiter,
};

export type RateLimitGroup = keyof typeof rateLimitRegistry;
