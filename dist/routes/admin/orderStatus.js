import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { validateTransition } from '../../lib/statusEngine.js';
import { incrementStock } from '../../lib/stockService.js';
import { statusTransitionSchema, orderNoteSchema } from '../../lib/validate.js';
const router = Router();
router.patch('/:id/status', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'ORDERS_UPDATE_STATUS');
        const { id } = req.params;
        const parsed = statusTransitionSchema.parse(req.body);
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) {
            throw new AppError('NOT_FOUND', 'Order not found');
        }
        if (order.version !== parsed.version) {
            const current = await prisma.order.findUnique({
                where: { id },
                include: { items: true, history: { orderBy: { createdAt: 'desc' }, take: 5 } },
            });
            res.status(409).json({ error: { code: 'CONFLICT', message: 'Order was modified by another user' }, current });
            return;
        }
        const validatedStatus = validateTransition(order.status, parsed.toStatus, staff.user.role);
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.order.update({
                where: { id, version: order.version },
                data: {
                    status: validatedStatus,
                    version: { increment: 1 },
                    lastActorId: staff.user.id,
                    internalNote: parsed.note || order.internalNote,
                },
                include: {
                    items: true,
                    history: { orderBy: { createdAt: 'desc' }, take: 10 },
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    fromStatus: order.status,
                    toStatus: validatedStatus,
                    actorId: staff.user.id,
                    actorRole: staff.user.role,
                    note: parsed.note || null,
                },
            });
            if (validatedStatus === 'Cancelled' || validatedStatus === 'Returned') {
                for (const item of result.items) {
                    if (item.productId) {
                        await incrementStock(tx, item.productId, item.quantity);
                    }
                }
            }
            return result;
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/notes', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'ORDERS_ADD_NOTE');
        const { id } = req.params;
        const parsed = orderNoteSchema.parse(req.body);
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) {
            throw new AppError('NOT_FOUND', 'Order not found');
        }
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.order.update({
                where: { id },
                data: {
                    internalNote: parsed.content,
                    lastActorId: staff.user.id,
                },
                include: {
                    items: true,
                    history: { orderBy: { createdAt: 'desc' }, take: 10 },
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    fromStatus: order.status,
                    toStatus: order.status,
                    actorId: staff.user.id,
                    actorRole: staff.user.role,
                    note: parsed.content,
                },
            });
            return result;
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=orderStatus.js.map