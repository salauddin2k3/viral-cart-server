import { AppError } from '../types/api.js';
export async function decrementStockAtomic(prisma, items) {
    for (const item of items) {
        if (item.variantId) {
            const variant = await prisma.productVariant.findUnique({
                where: { id: item.variantId },
                select: { name: true, stock: true, productId: true },
            });
            if (!variant) {
                throw new AppError('NOT_FOUND', `Variant not found: ${item.productName}`);
            }
            if (variant.stock < item.quantity) {
                throw new AppError('CONFLICT', `Insufficient stock for "${item.productName} - ${variant.name}". Available: ${variant.stock}, requested: ${item.quantity}`);
            }
            const updated = await prisma.productVariant.updateMany({
                where: {
                    id: item.variantId,
                    stock: { gte: item.quantity },
                },
                data: {
                    stock: { decrement: item.quantity },
                },
            });
            if (updated.count === 0) {
                throw new AppError('CONFLICT', `Insufficient stock for "${item.productName} - ${variant.name}". Available: ${variant.stock}, requested: ${item.quantity}`);
            }
        }
        else {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true, stock: true, trackInventory: true },
            });
            if (!product) {
                throw new AppError('NOT_FOUND', `Product not found: ${item.productName}`);
            }
            if (!product.trackInventory) {
                continue;
            }
            if (product.stock < item.quantity) {
                throw new AppError('CONFLICT', `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`);
            }
            const updated = await prisma.product.updateMany({
                where: {
                    id: item.productId,
                    stock: { gte: item.quantity },
                    trackInventory: true,
                },
                data: {
                    stock: { decrement: item.quantity },
                },
            });
            if (updated.count === 0) {
                throw new AppError('CONFLICT', `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`);
            }
        }
    }
}
export async function incrementStock(prisma, productId, quantity) {
    await prisma.product.update({
        where: { id: productId },
        data: {
            stock: { increment: quantity },
        },
    });
}
export async function adjustStock(prisma, productId, newStock, reason, actorId, actorRole) {
    if (newStock < 0) {
        throw new AppError('BAD_REQUEST', 'Stock cannot be negative');
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        throw new AppError('NOT_FOUND', 'Product not found');
    }
    const delta = newStock - product.stock;
    await prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
    });
    await prisma.activityLog.create({
        data: {
            actorId,
            actorRole,
            action: 'stock_adjusted',
            entityType: 'product',
            entityId: productId,
            metadata: {
                previousStock: product.stock,
                newStock,
                delta,
                reason,
            },
        },
    });
}
//# sourceMappingURL=stockService.js.map