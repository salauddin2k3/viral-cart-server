import type { Request } from 'express';
import { StaffRole, StaffSessionUser } from './auth.js';
export interface StaffContext {
    user: StaffSessionUser;
    sessionId: string;
    token: string;
}
export declare function getStaffSession(req: Pick<Request, 'headers'>): Promise<StaffContext | null>;
export declare function revokeAllStaffSessions(userId: string): Promise<void>;
export declare function requireAuth(req: Pick<Request, 'headers'>, role?: StaffRole): Promise<StaffContext>;
export declare function requirePermission(staff: StaffContext, permission: string): void;
export declare function hasPermission(staff: StaffContext, permission: string): boolean;
export declare function canManageUser(actor: StaffContext, targetRole: StaffRole): boolean;
export declare function canCreateRole(actor: StaffContext, targetRole: StaffRole): boolean;
export declare const ALL_PERMISSIONS: readonly ["ORDERS_VIEW", "ORDERS_UPDATE_STATUS", "ORDERS_ADD_NOTE", "ORDERS_DELETE", "PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE", "PRODUCTS_TOGGLE_STATUS", "CATEGORIES_VIEW", "CATEGORIES_CREATE", "CATEGORIES_UPDATE", "CATEGORIES_DELETE", "HERO_VIEW", "HERO_CREATE", "HERO_UPDATE", "HERO_DELETE", "HERO_CAROUSEL_MANAGE", "LEADS_VIEW", "LEADS_UPDATE", "LEADS_ADD_NOTE", "MODERATORS_VIEW", "MODERATORS_CREATE", "MODERATORS_UPDATE", "MODERATORS_DELETE", "MODERATORS_DISABLE", "MODERATORS_RESET_PASSWORD", "DELIVERY_SETTINGS_VIEW", "DELIVERY_SETTINGS_UPDATE", "LANDING_PAGES_VIEW", "LANDING_PAGES_CREATE", "LANDING_PAGES_UPDATE", "LANDING_PAGES_DELETE"];
export declare const MODERATOR_DEFAULT_PERMISSIONS: readonly ["ORDERS_VIEW", "ORDERS_UPDATE_STATUS", "ORDERS_ADD_NOTE", "ORDERS_DELETE", "PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_TOGGLE_STATUS", "CATEGORIES_VIEW", "CATEGORIES_CREATE", "CATEGORIES_UPDATE", "DELIVERY_SETTINGS_VIEW", "DELIVERY_SETTINGS_UPDATE", "LEADS_VIEW", "LEADS_UPDATE", "LEADS_ADD_NOTE"];
export type Permission = (typeof ALL_PERMISSIONS)[number];
export declare const PERMISSION_GROUPS: {
    readonly Orders: readonly ["ORDERS_VIEW", "ORDERS_UPDATE_STATUS", "ORDERS_ADD_NOTE", "ORDERS_DELETE"];
    readonly Products: readonly ["PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE", "PRODUCTS_TOGGLE_STATUS"];
    readonly Categories: readonly ["CATEGORIES_VIEW", "CATEGORIES_CREATE", "CATEGORIES_UPDATE", "CATEGORIES_DELETE"];
    readonly 'Hero / Featured': readonly ["HERO_VIEW", "HERO_CREATE", "HERO_UPDATE", "HERO_DELETE", "HERO_CAROUSEL_MANAGE"];
    readonly 'Customer Leads': readonly ["LEADS_VIEW", "LEADS_UPDATE", "LEADS_ADD_NOTE"];
    readonly 'Staff Management': readonly ["MODERATORS_VIEW", "MODERATORS_CREATE", "MODERATORS_UPDATE", "MODERATORS_DELETE", "MODERATORS_DISABLE", "MODERATORS_RESET_PASSWORD"];
    readonly 'Delivery Settings': readonly ["DELIVERY_SETTINGS_VIEW", "DELIVERY_SETTINGS_UPDATE"];
    readonly 'Landing Pages': readonly ["LANDING_PAGES_VIEW", "LANDING_PAGES_CREATE", "LANDING_PAGES_UPDATE", "LANDING_PAGES_DELETE"];
};
//# sourceMappingURL=guard.d.ts.map