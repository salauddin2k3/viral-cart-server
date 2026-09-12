export declare const auth: import("better-auth").Auth<{
    secret: string | undefined;
    baseURL: string;
    trustedOrigins: string[];
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    emailAndPassword: {
        enabled: true;
        disableSignUp: true;
        minPasswordLength: number;
    };
    session: {
        expiresIn: number;
        updateAge: number;
    };
    user: {
        additionalFields: {
            role: {
                type: "string";
                defaultValue: string;
                input: false;
            };
            status: {
                type: "string";
                defaultValue: string;
                input: false;
            };
            mustChangePassword: {
                type: "boolean";
                defaultValue: false;
                input: false;
            };
            permissions: {
                type: "string[]";
                defaultValue: never[];
                input: false;
            };
        };
    };
}>;
export type StaffRole = 'admin' | 'moderator';
export interface StaffSessionUser {
    id: string;
    name: string;
    email: string;
    role: StaffRole;
    status: 'active' | 'deactivated';
    mustChangePassword: boolean;
    permissions: string[];
}
export declare function isSessionWithinLifetime(session: {
    createdAt: Date;
    updatedAt: Date;
}): boolean;
export type Session = typeof auth.$Infer.Session;
//# sourceMappingURL=auth.d.ts.map