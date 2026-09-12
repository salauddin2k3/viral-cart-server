import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../types/api.js';
import { rateLimitRegistry } from '../lib/rateLimit.js';
import { isValidBdPhone, normalizeBdPhone } from '../lib/phone.js';
import { getCustomerStatusLabel } from '../lib/statusEngine.js';
const router = Router();
const trackSchema = z.object({
    trackingCode: z.string().min(1).optional(),
    orderNumber: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
}).refine((data) => data.trackingCode || data.orderNumber || data.phone, { message: 'At least one search field is required' });
function sanitizeOrder(order) {
    const timeline = order.history.map((h) => ({
        status: h.toStatus,
        customerStatus: getCustomerStatusLabel(h.toStatus),
        date: h.createdAt,
    }));
    return {
        orderNumber: order.orderNumber,
        date: order.createdAt,
        items: order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
        })),
        total: order.total,
        currentStatus: order.status,
        customerStatus: getCustomerStatusLabel(order.status),
        timeline,
    };
}
router.post('/', rateLimitRegistry.tracking, async (req, res, next) => {
    try {
        const parsed = trackSchema.parse(req.body);
        // Case 1: Track by order number
        if (parsed.orderNumber) {
            const order = await prisma.order.findFirst({
                where: { orderNumber: parsed.orderNumber },
                include: {
                    items: {
                        select: {
                            productName: true,
                            quantity: true,
                            unitPrice: true,
                            lineTotal: true,
                        },
                    },
                    history: {
                        select: { toStatus: true, createdAt: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
            if (!order) {
                res.status(200).json({ found: false });
                return;
            }
            res.json({ found: true, ...sanitizeOrder(order) });
            return;
        }
        // Case 2: Track by tracking code + phone (original)
        if (parsed.trackingCode) {
            let normalizedPhone;
            if (parsed.phone) {
                if (!isValidBdPhone(parsed.phone)) {
                    throw new AppError('BAD_REQUEST', 'Invalid phone number');
                }
                normalizedPhone = normalizeBdPhone(parsed.phone);
            }
            const where = {
                trackingCode: parsed.trackingCode,
            };
            if (normalizedPhone) {
                where.customerPhone = normalizedPhone;
            }
            const order = await prisma.order.findFirst({
                where,
                include: {
                    items: {
                        select: {
                            productName: true,
                            quantity: true,
                            unitPrice: true,
                            lineTotal: true,
                        },
                    },
                    history: {
                        select: { toStatus: true, createdAt: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
            if (!order) {
                res.status(200).json({ found: false });
                return;
            }
            res.json({ found: true, ...sanitizeOrder(order) });
            return;
        }
        // Case 3: Track by phone only — return all orders
        if (parsed.phone) {
            if (!isValidBdPhone(parsed.phone)) {
                throw new AppError('BAD_REQUEST', 'Invalid phone number');
            }
            const normalizedPhone = normalizeBdPhone(parsed.phone);
            const orders = await prisma.order.findMany({
                where: { customerPhone: normalizedPhone },
                include: {
                    items: {
                        select: {
                            productName: true,
                            quantity: true,
                            unitPrice: true,
                            lineTotal: true,
                        },
                    },
                    history: {
                        select: { toStatus: true, createdAt: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });
            if (orders.length === 0) {
                res.status(200).json({ found: false });
                return;
            }
            res.json({
                found: true,
                multiple: true,
                orders: orders.map((order) => sanitizeOrder(order)),
            });
            return;
        }
        res.status(200).json({ found: false });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=tracking.js.map