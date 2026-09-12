import { auth, isSessionWithinLifetime } from './auth.js';
import { prisma } from './prisma.js';
import { AppError } from '../types/api.js';
export async function getStaffSession(req) {
    const forwardedHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") {
            forwardedHeaders.set(key, value);
        }
        else if (Array.isArray(value)) {
            forwardedHeaders.set(key, value.join(", "));
        }
    }
    const result = await auth.api.getSession({ headers: forwardedHeaders });
    if (!result?.user || !result.session) {
        return null;
    }
    const u = result.user;
    const dbUser = await prisma.user.findUnique({
        where: { id: u.id },
        select: { permissions: true, role: true, status: true, mustChangePassword: true },
    });
    return {
        user: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: (dbUser?.role ?? u.role),
            status: (dbUser?.status ?? u.status),
            mustChangePassword: (dbUser?.mustChangePassword ?? u.mustChangePassword),
            permissions: Array.isArray(dbUser?.permissions) ? dbUser.permissions : [],
        },
        sessionId: result.session.id,
        token: result.session.token ?? '',
    };
}
export async function revokeAllStaffSessions(userId) {
    const context = await auth.$context;
    await context.internalAdapter.deleteUserSessions(userId);
}
export async function requireAuth(req, role) {
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
export function requirePermission(staff, permission) {
    if (staff.user.role === 'admin')
        return;
    if (!staff.user.permissions.includes(permission)) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions');
    }
}
export function hasPermission(staff, permission) {
    if (staff.user.role === 'admin')
        return true;
    return staff.user.permissions.includes(permission);
}
export function canManageUser(actor, targetRole) {
    const hierarchy = {
        admin: 2,
        moderator: 1,
    };
    return hierarchy[actor.user.role] > hierarchy[targetRole];
}
export function canCreateRole(actor, targetRole) {
    if (actor.user.role === 'admin' && targetRole === 'moderator')
        return true;
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
];
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
];
export const PERMISSION_GROUPS = {
    'Orders': ['ORDERS_VIEW', 'ORDERS_UPDATE_STATUS', 'ORDERS_ADD_NOTE', 'ORDERS_DELETE'],
    'Products': ['PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE', 'PRODUCTS_DELETE', 'PRODUCTS_TOGGLE_STATUS'],
    'Categories': ['CATEGORIES_VIEW', 'CATEGORIES_CREATE', 'CATEGORIES_UPDATE', 'CATEGORIES_DELETE'],
    'Hero / Featured': ['HERO_VIEW', 'HERO_CREATE', 'HERO_UPDATE', 'HERO_DELETE', 'HERO_CAROUSEL_MANAGE'],
    'Customer Leads': ['LEADS_VIEW', 'LEADS_UPDATE', 'LEADS_ADD_NOTE'],
    'Staff Management': ['MODERATORS_VIEW', 'MODERATORS_CREATE', 'MODERATORS_UPDATE', 'MODERATORS_DELETE', 'MODERATORS_DISABLE', 'MODERATORS_RESET_PASSWORD'],
    'Delivery Settings': ['DELIVERY_SETTINGS_VIEW', 'DELIVERY_SETTINGS_UPDATE'],
    'Landing Pages': ['LANDING_PAGES_VIEW', 'LANDING_PAGES_CREATE', 'LANDING_PAGES_UPDATE', 'LANDING_PAGES_DELETE'],
};
//# sourceMappingURL=guard.js.map