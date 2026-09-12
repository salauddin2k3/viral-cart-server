import { PrismaClient } from '@prisma/client';
type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
type PrismaExecRawClient = PrismaClient | PrismaTransactionClient;
export interface StockDecrementItem {
    productId: string;
    variantId?: string;
    productName: string;
    quantity: number;
}
export declare function decrementStockAtomic(prisma: PrismaExecRawClient, items: StockDecrementItem[]): Promise<void>;
export declare function incrementStock(prisma: PrismaExecRawClient, productId: string, quantity: number): Promise<void>;
export declare function adjustStock(prisma: PrismaExecRawClient, productId: string, newStock: number, reason: string, actorId: string, actorRole: string): Promise<void>;
export {};
//# sourceMappingURL=stockService.d.ts.map