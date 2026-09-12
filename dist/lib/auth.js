import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from './prisma.js';
const SESSION_ABSOLUTE_HOURS = 12;
const SESSION_IDLE_MINUTES = 120;
export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5000',
    trustedOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        minPasswordLength: 8,
    },
    session: {
        expiresIn: SESSION_ABSOLUTE_HOURS * 60 * 60,
        updateAge: 60 * 60,
    },
    user: {
        additionalFields: {
            role: { type: 'string', defaultValue: 'moderator', input: false },
            status: { type: 'string', defaultValue: 'active', input: false },
            mustChangePassword: { type: 'boolean', defaultValue: false, input: false },
            permissions: { type: 'string[]', defaultValue: [], input: false },
        },
    },
});
export function isSessionWithinLifetime(session) {
    const now = Date.now();
    const absoluteOk = now - new Date(session.createdAt).getTime() <= SESSION_ABSOLUTE_HOURS * 60 * 60 * 1000;
    const idleOk = now - new Date(session.updatedAt).getTime() <= SESSION_IDLE_MINUTES * 60 * 1000;
    return absoluteOk && idleOk;
}
//# sourceMappingURL=auth.js.map