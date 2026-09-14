import type { Request } from 'express';
import { auth, isSessionWithinLifetime, StaffRole, StaffSessionUser } from './auth.js';
import { prisma } from './prisma.js';
import { AppError } from '../types/api.js';

export interface StaffContext {
  user: StaffSessionUser;
  sessionId: string;
  token: string;
}

export async function getStaffSession(req: Pick<Request, 'headers'>): Promise<StaffContext | null> {
    const forwardedHeaders = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      forwardedHeaders.set(key, value);
    } else if (Array.isArray(value)) {
      forwardedHeaders.set(key, value.join(", "));
    }
  }
  const result = await auth.api.getSession({ headers: forwardedHeaders });
  if (!result?.user || !result.session) {
    return null;
  }
  const u = result.user as unknown as Record<string, unknown>;
  const dbUser = await prisma.user.findUnique({
    where: { id: u.id as string },
    select: { permissions: true, role: true, status: true, mustChangePassword: true },
  });
  return {
    user: {
      id: u.id as string,
      name: u.name as string,
      email: u.email as string,
      role: (dbUser?.role ?? u.role) as StaffRole,
      status: (dbUser?.status ?? u.status) as 'active' | 'deactivated',
      mustChangePassword: (dbUser?.mustChangePassword ?? u.mustChangePassword) as boolean,
      permissions: Array.isArray(dbUser?.permissions) ? (dbUser.permissions as string[]) : [],
    },
    sessionId: result.session.id,
    token: result.session.token ?? '',
  };
}

export async function revokeAllStaffSessions(userId: string): Promise<void> {
  const context = await auth.$context;
  await context.internalAdapter.deleteUserSessions(userId);
}

export async function requireAuth(req: Pick<Request, 'headers'>, role?: StaffRole): Promise<StaffContext> {
  const found = await getStaffSession(req);
  if (!found) {
    throw new AppError('UNAUTHORIZED', 'Authentication required');
  }

  if (found.user.status !== 'active') {
    await revokeAllStaffSessions(found.user.id);
    throw new AppError('UNAUTHORIZED', 'Authentication required');
  }

  const sessionRow = await prisma.session.findUnique({ where: { id: found.sessionId } });
  if (!sessionRow || !isSessionWithinLifetime(sessionRow)) {
    await revokeAllStaffSessions(found.user.id);
    throw new AppError('UNAUTHORIZED', 'Authentication required');
  }

  if (role && found.user.role !== role) {
    throw new AppError('FORBIDDEN', 'Insufficient permissions');
  }

  return found;
}

export function requirePermission(staff: StaffContext, permission: string): void {
  if (staff.user.role === 'admin') return;
  if (!staff.user.permissions.includes(permission)) {
    throw new AppError('FORBIDDEN', 'Insufficient permissions');
  }
}

export function hasPermission(staff: StaffContext, permission: string): boolean {
  if (staff.user.role === 'admin') return true;
  return staff.user.permissions.includes(permission);
}

export function canManageUser(actor: StaffContext, targetRole: StaffRole): boolean {
  const hierarchy: Record<StaffRole, number> = {
    admin: 2,
    moderator: 1,
  };

  return hierarchy[actor.user.role] > hierarchy[targetRole];
}

export function canCreateRole(actor: StaffContext, targetRole: StaffRole): boolean {
  if (actor.user.role === 'admin' && targetRole === 'moderator') return true;
  return false;
}

export const ALL_PERMISSIONS = [
  'ORDERS_VIEW',
  'ORDERS_UPDATE_STATUS',
  'ORDERS_ADD_NOTE',
  'ORDERS_DELETE',
  'PRODUCTS_VIEW',
  'PRODUCTS_CREATE',
  'PRODUCTS_UPDATE',
  'PRODUCTS_DELETE',
  'PRODUCTS_TOGGLE_STATUS',
  'CATEGORIES_VIEW',
  'CATEGORIES_CREATE',
  'CATEGORIES_UPDATE',
  'CATEGORIES_DELETE',
  'HERO_VIEW',
  'HERO_CREATE',
  'HERO_UPDATE',
  'HERO_DELETE',
  'HERO_CAROUSEL_MANAGE',
  'LEADS_VIEW',
  'LEADS_UPDATE',
  'LEADS_ADD_NOTE',
  'MODERATORS_VIEW',
  'MODERATORS_CREATE',
  'MODERATORS_UPDATE',
  'MODERATORS_DELETE',
  'MODERATORS_DISABLE',
  'MODERATORS_RESET_PASSWORD',
  'DELIVERY_SETTINGS_VIEW',
  'DELIVERY_SETTINGS_UPDATE',
  'LANDING_PAGES_VIEW',
  'LANDING_PAGES_CREATE',
  'LANDING_PAGES_UPDATE',
  'LANDING_PAGES_DELETE',
] as const;

export const MODERATOR_DEFAULT_PERMISSIONS = [
  'ORDERS_VIEW',
  'ORDERS_UPDATE_STATUS',
  'ORDERS_ADD_NOTE',
  'ORDERS_DELETE',
  'PRODUCTS_VIEW',
  'PRODUCTS_CREATE',
  'PRODUCTS_UPDATE',
  'PRODUCTS_TOGGLE_STATUS',
  'CATEGORIES_VIEW',
  'CATEGORIES_CREATE',
  'CATEGORIES_UPDATE',
  'DELIVERY_SETTINGS_VIEW',
  'DELIVERY_SETTINGS_UPDATE',
  'LEADS_VIEW',
  'LEADS_UPDATE',
  'LEADS_ADD_NOTE',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_GROUPS = {
  'Orders': ['ORDERS_VIEW', 'ORDERS_UPDATE_STATUS', 'ORDERS_ADD_NOTE', 'ORDERS_DELETE'],
  'Products': ['PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE', 'PRODUCTS_TOGGLE_STATUS'],
  'Categories': ['CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE', 'CATEGORIES_DELETE'],
  'Hero / Featured': ['HERO_VIEW', 'HERO_CREATE', 'HERO_UPDATE', 'HERO_DELETE', 'HERO_CAROUSEL_MANAGE'],
  'Customer Leads': ['LEADS_VIEW', 'LEADS_UPDATE', 'LEADS_ADD_NOTE'],
  'Staff Management': ['MODERATORS_VIEW', 'MODERATORS_CREATE', 'MODERATORS_UPDATE', 'MODERATORS_DELETE', 'MODERATORS_DISABLE', 'MODERATORS_RESET_PASSWORD'],
  'Delivery Settings': ['DELIVERY_SETTINGS_VIEW', 'DELIVERY_SETTINGS_UPDATE'],
  'Landing Pages': ['LANDING_PAGES_VIEW', 'LANDING_PAGES_CREATE', 'LANDING_PAGES_UPDATE', 'LANDING_PAGES_DELETE'],
} as const;
