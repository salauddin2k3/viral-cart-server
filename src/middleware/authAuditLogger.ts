import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getStaffSession } from '../lib/guard.js';

const MOUNT_PATH = '/api/auth';

function eventFor(subPath: string, status: number): string | null {
  if (subPath === '/sign-in/email') {
    return status < 400 ? 'login_success' : 'login_failed';
  }
  if (subPath === '/sign-out' && status < 400) {
    return 'logout';
  }
  if (subPath === '/change-password' && status < 400) {
    return 'password_change';
  }
  return null;
}

function actorResolvablePath(subPath: string): boolean {
  return subPath === '/sign-out' || subPath === '/change-password';
}

export function authAuditLogger(req: Request, res: Response, next: NextFunction): void {
  if (!req.originalUrl.startsWith(MOUNT_PATH)) {
    next();
    return;
  }

  const subPath = req.originalUrl.slice(MOUNT_PATH.length).split('?')[0];

  if (actorResolvablePath(subPath)) {
    void getStaffSession(req)
      .then((staff) => {
        if (staff) {
          res.locals.staffUserId = staff.user.id;
          res.locals.staffRole = staff.user.role;
        }
      })
      .catch((logErr: unknown) => {
            console.error(JSON.stringify({ msg: 'audit_write_failed', detail: String(logErr).slice(0, 120) }));
          });
  }

  res.on('finish', () => {
    const event = eventFor(subPath, res.statusCode);
    if (!event) {
      return;
    }
    void prisma.activityLog
      .create({
        data: {
          actorId: (res.locals.staffUserId as string | undefined) ?? null,
          actorRole: (res.locals.staffRole as string | undefined) ?? null,
          action: event,
          entityType: 'auth',
          metadata: { status: res.statusCode },
        },
      })
      .catch((logErr: unknown) => {
            console.error(JSON.stringify({ msg: 'audit_write_failed', detail: String(logErr).slice(0, 120) }));
          });
  });

  next();
}
