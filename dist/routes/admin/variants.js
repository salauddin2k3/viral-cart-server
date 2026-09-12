import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { calculateFinalPrice } from '../../lib/money.js';
import { Prisma } from '@prisma/client';
const router = Router();
const variantCreateSchema = z.object({
    name: z.string().min(1).max(100),
    sku: z.string().min(1).max(50),
    regularPrice: z.number().positive(),
    discountEnabled: z.boolean().default(false),
    discountPercent: z.number().int().min(0).max(100).default(0),
    stock: z.number().int().min(0).default(0),
    sortOrder: z.number().int().min(0).default(0),
});
const variantUpdateSchema = variantCreateSchema.partial();
router.get('/:productId/variants', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'PRODUCTS_VIEW');
        const { productId } = req.params;
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new AppError('NOT_FOUND', 'Product not found');
        const variants = await prisma.productVariant.findMany({
            where: { productId },
            orderBy: { sortOrder: 'asc' },
        });
        res.json({ items: variants });
    }
    catch (err) {
        next(err);
    }
});
router.post('/:productId/variants', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'PRODUCTS_UPDATE');
        const { productId } = req.params;
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new AppError('NOT_FOUND', 'Product not found');
        const parsed = variantCreateSchema.parse(req.body);
        const existingSku = await prisma.productVariant.findUnique({ where: { sku: parsed.sku } });
        if (existingSku)
            throw new AppError('CONFLICT', 'SKU already exists');
        const finalPrice = parsed.discountEnabled
            ? calculateFinalPrice(parsed.regularPrice, parsed.discountPercent)
            : parsed.regularPrice;
        const variant = await prisma.productVariant.create({
            data: {
                productId,
                name: parsed.name,
                sku: parsed.sku,
                regularPrice: new Prisma.Decimal(parsed.regularPrice),
                discountEnabled: parsed.discountEnabled,
                discountPercent: parsed.discountPercent,
                finalPrice: new Prisma.Decimal(finalPrice),
                stock: parsed.stock,
                sortOrder: parsed.sortOrder,
            },
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'variant_created',
                entityType: 'product_variant',
                entityId: variant.id,
                metadata: { productId, name: variant.name, sku: variant.sku },
            },
        });
        res.status(201).json(variant);
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:productId/variants/:variantId', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'PRODUCTS_UPDATE');
        const { productId, variantId } = req.params;
        const existing = await prisma.productVariant.findFirst({
            where: { id: variantId, productId },
        });
        if (!existing)
            throw new AppError('NOT_FOUND', 'Variant not found');
        const parsed = variantUpdateSchema.parse(req.body);
        const updateData = {};
        if (parsed.name !== undefined)
            updateData.name = parsed.name;
        if (parsed.sku !== undefined) {
            if (parsed.sku !== existing.sku) {
                const skuExists = await prisma.productVariant.findUnique({ where: { sku: parsed.sku } });
                if (skuExists)
                    throw new AppError('CONFLICT', 'SKU already exists');
            }
            updateData.sku = parsed.sku;
        }
        if (parsed.regularPrice !== undefined)
            updateData.regularPrice = new Prisma.Decimal(parsed.regularPrice);
        if (parsed.discountEnabled !== undefined)
            updateData.discountEnabled = parsed.discountEnabled;
        if (parsed.discountPercent !== undefined)
            updateData.discountPercent = parsed.discountPercent;
        if (parsed.stock !== undefined)
            updateData.stock = parsed.stock;
        if (parsed.sortOrder !== undefined)
            updateData.sortOrder = parsed.sortOrder;
        const regularPrice = updateData.regularPrice ?? existing.regularPrice;
        const discountEnabled = updateData.discountEnabled ?? existing.discountEnabled;
        const discountPercent = updateData.discountPercent ?? existing.discountPercent;
        updateData.finalPrice = new Prisma.Decimal(discountEnabled ? calculateFinalPrice(Number(regularPrice), discountPercent) : Number(regularPrice));
        const variant = await prisma.productVariant.update({
            where: { id: variantId },
            data: updateData,
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'variant_updated',
                entityType: 'product_variant',
                entityId: variantId,
                metadata: { productId, changes: Object.keys(updateData) },
            },
        });
        res.json(variant);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:productId/variants/:variantId', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'PRODUCTS_DELETE');
        const { productId, variantId } = req.params;
        const existing = await prisma.productVariant.findFirst({
            where: { id: variantId, productId },
        });
        if (!existing)
            throw new AppError('NOT_FOUND', 'Variant not found');
        const orderItemCount = await prisma.orderItem.count({ where: { variantId } });
        if (orderItemCount > 0) {
            throw new AppError('CONFLICT', 'Cannot delete variant referenced by orders');
        }
        await prisma.productVariant.delete({ where: { id: variantId } });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'variant_deleted',
                entityType: 'product_variant',
                entityId: variantId,
                metadata: { productId, name: existing.name, sku: existing.sku },
            },
        });
        res.json({ deleted: true });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=variants.js.map