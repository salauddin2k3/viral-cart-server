import { NextFunction, Request, Response } from 'express';
interface RateLimitConfig {
    windowMs: number;
    max: number;
}
export declare function createRateLimiter(config: RateLimitConfig, name: string): (req: Request, _res: Response, next: NextFunction) => void;
export declare const rateLimitRegistry: {
    auth: (req: Request, _res: Response, next: NextFunction) => void;
    autosave: (req: Request, _res: Response, next: NextFunction) => void;
    orderSubmit: (req: Request, _res: Response, next: NextFunction) => void;
    tracking: (req: Request, _res: Response, next: NextFunction) => void;
    upload: (req: Request, _res: Response, next: NextFunction) => void;
};
export type RateLimitGroup = keyof typeof rateLimitRegistry;
export {};
//# sourceMappingURL=rateLimit.d.ts.map