export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export declare function deriveStockStatus(stock: number, threshold: number): StockStatus;
export declare function formatStockStatus(status: StockStatus): string;
//# sourceMappingURL=stock.d.ts.map