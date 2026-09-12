export function deriveStockStatus(stock, threshold) {
    if (stock <= 0)
        return 'out_of_stock';
    if (stock <= threshold)
        return 'low_stock';
    return 'in_stock';
}
export function formatStockStatus(status) {
    switch (status) {
        case 'out_of_stock':
            return 'Out of Stock';
        case 'low_stock':
            return 'Low Stock';
        case 'in_stock':
            return 'In Stock';
    }
}
//# sourceMappingURL=stock.js.map