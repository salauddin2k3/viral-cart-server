import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { parsePaginationParams, buildPaginationResult } from '../../lib/cursor.js';
import { calculateFinalPrice } from '../../lib/money.js';
import { generateOrderNumber, generateTrackingCode, initOrderSequence } from '../../lib/orderNumber.js';
import { decrementStockAtomic } from '../../lib/stockService.js';
import { Prisma } from '@prisma/client';
const router = Router();
function isAbandoned(session, windowMs) {
    if (!session.phone)
        return false;
    if (session.status !== 'active')
        return false;
    if (session.convertedOrderId)
        return false;
    const idleMs = Date.now() - new Date(session.updatedAt).getTime();
    return idleMs > windowMs;
}
router.get('/', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'LEADS_VIEW');
        const { limit, cursor } = parsePaginationParams(req.query);
        const status = req.query.status || undefined;
        const search = req.query.search || undefined;
        const dateFilter = req.query.date || undefined;
        const fromStr = req.query.from || undefined;
        const toStr = req.query.to || undefined;
        const windowMs = 60 * 60 * 1000;
        const where = {};
        if (status) {
            where.status = status;
        }
        else {
            where.status = { notIn: ['converted', 'discarded'] };
        }
        if (search) {
            where.AND = [
                { phone: { contains: search } },
                { phone: { not: null } },
                { address: { not: null } },
            ];
        }
        else {
            where.phone = { not: null };
            where.address = { not: null };
        }
        if (dateFilter === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            where.createdAt = { gte: start };
        }
        else if (dateFilter === 'yesterday') {
            const start = new Date();
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(0, 0, 0, 0);
            where.createdAt = { gte: start, lt: end };
        }
        else if (fromStr || toStr) {
            const createdAt = {};
            if (fromStr) {
                const from = new Date(fromStr);
                if (!isNaN(from.getTime()))
                    createdAt.gte = from;
            }
            if (toStr) {
                const to = new Date(toStr);
                if (!isNaN(to.getTime())) {
                    to.setHours(23, 59, 59, 999);
                    createdAt.lte = to;
                }
            }
            if (Object.keys(createdAt).length > 0)
                where.createdAt = createdAt;
        }
        const items = await prisma.checkoutSession.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true } },
                    },
                },
                convertedOrder: { select: { id: true, orderNumber: true } },
            },
            take: limit + 1,
            ...(cursor ? { skip: 1, cursor: { id: cursor.value } } : {}),
        });
        const enriched = items.map((s) => ({
            ...s,
            computedStatus: isAbandoned(s, windowMs) ? 'abandoned' : s.status,
        }));
        const hasMore = enriched.length > limit + 1;
        const page = hasMore ? enriched.slice(0, limit) : enriched;
        const response = buildPaginationResult(page, limit, hasMore);
        const idleThreshold = new Date(Date.now() - windowMs);
        const [activeCount, abandonedCount, convertedCount, discardedCount] = await Promise.all([
            prisma.checkoutSession.count({
                where: { status: 'active', phone: { not: null }, address: { not: null }, updatedAt: { gte: idleThreshold } },
            }),
            prisma.checkoutSession.count({
                where: { status: 'active', phone: { not: null }, address: { not: null }, updatedAt: { lt: idleThreshold }, convertedOrderId: null },
            }),
            prisma.checkoutSession.count({ where: { status: 'converted' } }),
            prisma.checkoutSession.count({ where: { status: 'discarded' } }),
        ]);
        res.json({
            ...response,
            summary: { active: activeCount, abandoned: abandonedCount, converted: convertedCount, discarded: discardedCount },
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'LEADS_VIEW');
        const { id } = req.params;
        const session = await prisma.checkoutSession.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true } },
                    },
                },
                convertedOrder: { select: { id: true, orderNumber: true, status: true } },
            },
        });
        if (!session) {
            throw new AppError('NOT_FOUND', 'Lead not found');
        }
        res.json(session);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/discard', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'LEADS_UPDATE');
        const { id } = req.params;
        const session = await prisma.checkoutSession.findUnique({ where: { id } });
        if (!session) {
            throw new AppError('NOT_FOUND', 'Lead not found');
        }
        if (session.status === 'converted') {
            throw new AppError('BAD_REQUEST', 'Lead has already been converted to an order');
        }
        if (session.status === 'discarded') {
            throw new AppError('BAD_REQUEST', 'Lead has already been discarded');
        }
        const updated = await prisma.checkoutSession.update({
            where: { id },
            data: { status: 'discarded' },
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'lead_discarded',
                entityType: 'checkout_session',
                entityId: id,
            },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/convert', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'LEADS_UPDATE');
        const { id } = req.params;
        const session = await prisma.checkoutSession.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!session) {
            throw new AppError('NOT_FOUND', 'Lead not found');
        }
        if (session.status === 'converted') {
            throw new AppError('BAD_REQUEST', 'Lead has already been converted');
        }
        if (session.status === 'discarded') {
            throw new AppError('BAD_REQUEST', 'Lead has been discarded');
        }
        if (!session.phone) {
            throw new AppError('BAD_REQUEST', 'Lead has no phone number for conversion');
        }
        await initOrderSequence(prisma);
        const order = await prisma.$transaction(async (tx) => {
            const orderNumber = await generateOrderNumber(tx);
            const trackingCode = generateTrackingCode();
            let subtotal = new Prisma.Decimal(0);
            let discountTotal = new Prisma.Decimal(0);
            const orderItems = [];
            for (const item of session.items) {
                const product = item.productId
                    ? await tx.product.findUnique({ where: { id: item.productId } })
                    : null;
                if (item.productId && product) {
                    const serverFinalPrice = calculateFinalPrice(Number(product.regularPrice), product.discountEnabled ? product.discountPercent : 0);
                    const unitPrice = new Prisma.Decimal(serverFinalPrice);
                    const lineTotal = unitPrice.mul(item.quantity);
                    subtotal = subtotal.add(lineTotal);
                    discountTotal = discountTotal.add(new Prisma.Decimal(Number(product.regularPrice)).sub(unitPrice).mul(item.quantity));
                    orderItems.push({
                        productId: product.id,
                        productName: product.name,
                        sku: product.sku,
                        unitPrice,
                        discountPercent: product.discountEnabled ? product.discountPercent : 0,
                        lineTotal,
                        quantity: item.quantity,
                    });
                }
                else {
                    const unitPrice = new Prisma.Decimal(item.unitPrice);
                    const lineTotal = unitPrice.mul(item.quantity);
                    subtotal = subtotal.add(lineTotal);
                    orderItems.push({
                        productId: '',
                        productName: item.nameSnapshot,
                        sku: 'UNKNOWN',
                        unitPrice,
                        discountPercent: item.discountPercent,
                        lineTotal,
                        quantity: item.quantity,
                    });
                }
            }
            const deliveryCharge = new Prisma.Decimal(0);
            const total = subtotal.add(deliveryCharge);
            const createdOrder = await tx.order.create({
                data: {
                    orderNumber,
                    trackingCode,
                    customerName: session.name || 'Unknown',
                    customerPhone: session.phone,
                    districtArea: session.districtArea,
                    address: session.address || '',
                    note: session.note,
                    subtotal,
                    discountTotal,
                    deliveryCharge,
                    total,
                    paymentMethod: 'COD',
                    paymentStatus: 'Pending',
                    status: 'New',
                    checkoutSessionId: session.id,
                    lastActorId: staff.user.id,
                    items: {
                        create: orderItems.map((item) => ({
                            ...item,
                            productId: item.productId || undefined,
                        })),
                    },
                    history: {
                        create: {
                            fromStatus: null,
                            toStatus: 'New',
                            actorId: staff.user.id,
                            actorRole: staff.user.role,
                            note: `Converted from lead (session ${session.sessionId})`,
                        },
                    },
                },
                include: {
                    items: true,
                    history: true,
                },
            });
            for (const item of orderItems) {
                if (item.productId) {
                    await decrementStockAtomic(tx, [
                        { productId: item.productId, productName: item.productName, quantity: item.quantity },
                    ]);
                }
            }
            await tx.checkoutSession.update({
                where: { id: session.id },
                data: {
                    status: 'converted',
                    convertedOrderId: createdOrder.id,
                },
            });
            return createdOrder;
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'lead_converted',
                entityType: 'checkout_session',
                entityId: id,
                metadata: { orderId: order.id, orderNumber: order.orderNumber },
            },
        });
        res.status(201).json(order);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=leads.js.map