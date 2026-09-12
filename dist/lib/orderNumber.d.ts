import { PrismaClient } from '@prisma/client';
type PrismaTxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
type PrismaQueryClient = PrismaClient | PrismaTxClient;
export declare function generateOrderNumber(prisma: PrismaQueryClient): Promise<string>;
export declare function generateTrackingCode(): string;
export declare function initOrderSequence(prisma: PrismaQueryClient): Promise<void>;
export {};
//# sourceMappingURL=orderNumber.d.ts.map