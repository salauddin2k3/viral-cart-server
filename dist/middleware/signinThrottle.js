import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../types/api.js';
const MAX_FAILS = 5;
const BASE_LOCKOUT_MS = 15 * 60 * 1000;
const LOCKOUT_CAP_MS = 24 * 60 * 60 * 1000;
const records = new Map();
function keyFor(email, ip) {
    const emailHash = createHash('sha256').update(String(email ?? '').toLowerCase()).digest('hex');
    return `${emailHash}|${ip ?? 'unknown'}`;
}
export function signInThrottle(req, res, next) {
    if (!(req.method === 'POST' && req.originalUrl === '/api/auth/sign-in/email')) {
        next();
        return;
    }
    const key = keyFor(req.body?.email, req.ip);
    const record = records.get(key);
    if (record && record.lockedUntil > Date.now()) {
        next(new AppError('RATE_LIMITED', 'Too many attempts. Try again later.'));
        return;
    }
    res.locals.throttleKey = key;
    res.on('finish', () => {
        const settledKey = res.locals.throttleKey;
        if (!settledKey) {
            return;
        }
        const success = res.statusCode < 400;
        const current = records.get(settledKey) ?? { fails: 0, lockoutCount: 0, lockedUntil: 0 };
        if (success) {
            records.delete(settledKey);
            return;
        }
        current.fails += 1;
        if (current.fails >= MAX_FAILS) {
            current.lockoutCount += 1;
            const durationMs = Math.min(BASE_LOCKOUT_MS * 2 ** (current.lockoutCount - 1), LOCKOUT_CAP_MS);
            current.lockedUntil = Date.now() + durationMs;
            current.fails = 0;
            records.set(settledKey, current);
            void prisma.activityLog
                .create({
                data: {
                    action: 'auth_lockout',
                    entityType: 'auth',
                    entityId: settledKey.split('|')[0],
                    metadata: { until: new Date(current.lockedUntil).toISOString() },
                },
            })
                .catch(() => undefined);
            return;
        }
        records.set(settledKey, current);
    });
    next();
}
//# sourceMappingURL=signinThrottle.js.map