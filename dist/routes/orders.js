import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../types/api.js';
import { checkoutPayloadSchema } from '../lib/validate.js';
import { calculateFinalPrice } from '../lib/money.js';
import { decrementStockAtomic } from '../lib/stockService.js';
import { generateOrderNumber, generateTrackingCode, initOrderSequence } from '../lib/orderNumber.js';
import { rateLimitRegistry } from '../lib/rateLimit.js';
import { Prisma } from '@prisma/client';
const router = Router();
router.post('/', rateLimitRegistry.orderSubmit, async (req, res, next) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        if (!idempotencyKey) {
            throw new AppError('BAD_REQUEST', 'Idempotency-Key header is required');
        }
        const existing = await prisma.order.findUnique({
            where: { idempotencyKey },
            include: {
                items: true,
            },
        });
        if (existing) {
            res.status(200).json(existing);
            return;
        }
        const parsed = checkoutPayloadSchema.parse(req.body);
        await initOrderSequence(prisma);
        const order = await prisma.$transaction(async (tx) => {
            const orderNumber = await generateOrderNumber(tx);
            const trackingCode = generateTrackingCode();
            let subtotal = new Prisma.Decimal(0);
            let discountTotal = new Prisma.Decimal(0);
            const orderItems = [];
            for (const item of parsed.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });
                if (!product) {
                    throw new AppError('NOT_FOUND', `Product not found: ${item.name}`);
                }
                if (product.status !== 'active') {
                    throw new AppError('BAD_REQUEST', `Product "${product.name}" is no longer available`);
                }
                let variant = null;
                if (item.variantId) {
                    variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
                    if (!variant || variant.productId !== product.id) {
                        throw new AppError('NOT_FOUND', `Variant not found for product "${product.name}"`);
                    }
                    if (variant.stock < item.quantity) {
                        throw new AppError('CONFLICT', `Insufficient stock for "${product.name} - ${variant.name}". Available: ${variant.stock}, requested: ${item.quantity}`);
                    }
                }
                else if (product.trackInventory && product.stock < item.quantity) {
                    throw new AppError('CONFLICT', `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`);
                }
                const serverFinalPrice = variant
                    ? Number(variant.finalPrice)
                    : calculateFinalPrice(Number(product.regularPrice), product.discountEnabled ? product.discountPercent : 0);
                const unitPrice = new Prisma.Decimal(serverFinalPrice);
                const lineTotal = unitPrice.mul(item.quantity);
                subtotal = subtotal.add(lineTotal);
                discountTotal = discountTotal.add(new Prisma.Decimal(variant ? Number(variant.regularPrice) : Number(product.regularPrice)).sub(unitPrice).mul(item.quantity));
                orderItems.push({
                    productId: product.id,
                    variantId: item.variantId,
                    productName: variant ? `${product.name} - ${variant.name}` : product.name,
                    sku: variant?.sku ?? product.sku,
                    unitPrice,
                    discountPercent: variant
                        ? (variant.discountEnabled ? variant.discountPercent : 0)
                        : (product.discountEnabled ? product.discountPercent : 0),
                    lineTotal,
                    quantity: item.quantity,
                });
            }
            const deliveryCharge = new Prisma.Decimal(0);
            let resolvedDeliveryCharge = 0;
            const deliverySetting = await prisma.deliverySetting.findFirst();
            if (deliverySetting) {
                const location = parsed.deliveryLocation ?? 'inside_dhaka';
                const method = parsed.deliveryMethod ?? 'normal';
                if (location === 'outside_dhaka') {
                    resolvedDeliveryCharge = Number(deliverySetting.outsideDhakaNormal);
                }
                else if (location === 'dhaka_sub') {
                    resolvedDeliveryCharge = Number(deliverySetting.dhakaSubNormal);
                }
                else if (method === 'express' && deliverySetting.expressEnabled) {
                    resolvedDeliveryCharge = Number(deliverySetting.insideDhakaExpress);
                }
                else {
                    resolvedDeliveryCharge = Number(deliverySetting.insideDhakaNormal);
                }
            }
            const deliveryChargeFinal = new Prisma.Decimal(resolvedDeliveryCharge);
            const total = subtotal.add(deliveryChargeFinal);
            const createdOrder = await tx.order.create({
                data: {
                    orderNumber,
                    trackingCode,
                    customerName: parsed.name,
                    customerPhone: parsed.phone,
                    districtArea: parsed.districtArea,
                    deliveryLocation: parsed.deliveryLocation ?? 'inside_dhaka',
                    deliveryMethod: parsed.deliveryMethod ?? 'normal',
                    address: parsed.address,
                    note: parsed.note,
                    subtotal,
                    discountTotal,
                    deliveryCharge: deliveryChargeFinal,
                    total,
                    paymentMethod: 'COD',
                    paymentStatus: 'Pending',
                    status: 'New',
                    idempotencyKey,
                    items: {
                        create: orderItems.map((oi) => ({
                            productId: oi.productId,
                            variantId: oi.variantId,
                            productName: oi.productName,
                            sku: oi.sku,
                            unitPrice: oi.unitPrice,
                            discountPercent: oi.discountPercent,
                            lineTotal: oi.lineTotal,
                            quantity: oi.quantity,
                        })),
                    },
                    history: {
                        create: {
                            fromStatus: null,
                            toStatus: 'New',
                            note: 'Order created',
                        },
                    },
                },
                include: {
                    items: true,
                    history: true,
                },
            });
            for (const item of orderItems) {
                await decrementStockAtomic(tx, [
                    {
                        productId: item.productId,
                        variantId: item.variantId,
                        productName: item.productName,
                        quantity: item.quantity,
                    },
                ]);
            }
            if (parsed.sessionId) {
                await tx.checkoutSession.updateMany({
                    where: { sessionId: parsed.sessionId },
                    data: {
                        status: 'converted',
                        convertedOrderId: createdOrder.id,
                    },
                });
            }
            return createdOrder;
        });
        res.status(201).json(order);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=orders.js.map