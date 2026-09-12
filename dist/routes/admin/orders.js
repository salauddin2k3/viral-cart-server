import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { parsePaginationParams, buildPaginationResult } from '../../lib/cursor.js';
const router = Router();
function bdDateToUtcRange(dateStr, tzOffsetMinutes) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + tzOffsetMinutes * 60_000;
    const endUtcMs = startUtcMs + 86_400_000;
    return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}
router.get('/', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'ORDERS_VIEW');
        const { limit, cursor } = parsePaginationParams(req.query);
        const status = req.query.status || undefined;
        const search = req.query.search || undefined;
        const fromStr = req.query.from || undefined;
        const toStr = req.query.to || undefined;
        const sort = req.query.sort || 'createdAt_desc';
        const tzOffset = parseInt(req.query.tzOffset, 10);
        const tzMinutes = isNaN(tzOffset) ? -360 : tzOffset;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { customerPhone: { contains: search } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { orderNumber: { contains: search } },
                { trackingCode: { contains: search } },
            ];
        }
        if (fromStr || toStr) {
            const createdAt = {};
            if (fromStr) {
                const { start } = bdDateToUtcRange(fromStr, tzMinutes);
                createdAt.gte = start;
            }
            if (toStr) {
                const { end } = bdDateToUtcRange(toStr, tzMinutes);
                createdAt.lte = end;
            }
            if (Object.keys(createdAt).length > 0)
                where.createdAt = createdAt;
        }
        let orderBy = { createdAt: 'desc' };
        if (sort === 'createdAt_asc')
            orderBy = { createdAt: 'asc' };
        else if (sort === 'total_desc')
            orderBy = { total: 'desc' };
        else if (sort === 'total_asc')
            orderBy = { total: 'asc' };
        else if (sort === 'status_asc')
            orderBy = { status: 'asc' };
        const items = await prisma.order.findMany({
            where,
            orderBy,
            include: {
                items: { select: { id: true, productName: true, quantity: true, lineTotal: true, sku: true, unitPrice: true } },
                lastActor: { select: { id: true, name: true } },
            },
            take: limit + 1,
            ...(cursor ? { skip: 1, cursor: { id: cursor.value } } : {}),
        });
        const hasMore = items.length > limit + 1;
        const page = hasMore ? items.slice(0, limit) : items;
        const response = buildPaginationResult(page, limit, hasMore);
        res.json(response);
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'ORDERS_VIEW');
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: true,
                history: { orderBy: { createdAt: 'asc' } },
                lastActor: { select: { id: true, name: true, role: true } },
            },
        });
        if (!order) {
            throw new AppError('NOT_FOUND', 'Order not found');
        }
        res.json(order);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=orders.js.map