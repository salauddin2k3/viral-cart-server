import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { isValidBdPhone, normalizeBdPhone } from '../lib/phone.js';
import { rateLimitRegistry } from '../lib/rateLimit.js';
const router = Router();
const autosaveSchema = z.object({
    sessionId: z.string().uuid().optional(),
    name: z.string().trim().max(120).optional(),
    phone: z.string().trim().optional(),
    districtArea: z.string().trim().max(100).optional(),
    address: z.string().trim().max(500).optional(),
    note: z.string().trim().max(1000).optional(),
    deliveryMethod: z.string().trim().max(100).optional(),
    paymentMethod: z.string().trim().max(50).optional(),
    items: z
        .array(z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        name: z.string().trim().min(1),
        unitPrice: z.number().positive(),
        discountPercent: z.number().int().min(0).max(100),
        quantity: z.number().int().min(1).max(99),
    }))
        .max(60)
        .optional(),
});
function stripHtml(input) {
    return input.replace(/<[^>]*>/g, '');
}
router.post('/', rateLimitRegistry.autosave, async (req, res, next) => {
    try {
        const parsed = autosaveSchema.parse(req.body);
        let sessionId = parsed.sessionId;
        if (!sessionId) {
            sessionId = randomUUID();
        }
        let normalizedPhone = null;
        if (parsed.phone && isValidBdPhone(parsed.phone)) {
            normalizedPhone = normalizeBdPhone(parsed.phone);
        }
        const trimmedAddress = parsed.address?.trim() || null;
        if (!normalizedPhone || !trimmedAddress) {
            res.json({ sessionId });
            return;
        }
        const existingSession = await prisma.checkoutSession.findFirst({
            where: { sessionId: sessionId, status: 'active' },
        });
        const updateData = {};
        if (parsed.name !== undefined)
            updateData.name = stripHtml(parsed.name);
        if (normalizedPhone !== null)
            updateData.phone = normalizedPhone;
        if (parsed.districtArea !== undefined)
            updateData.districtArea = stripHtml(parsed.districtArea);
        if (trimmedAddress !== undefined)
            updateData.address = stripHtml(trimmedAddress);
        if (parsed.note !== undefined)
            updateData.note = stripHtml(parsed.note);
        if (parsed.deliveryMethod !== undefined)
            updateData.deliveryMethod = parsed.deliveryMethod;
        if (parsed.paymentMethod !== undefined)
            updateData.paymentMethod = parsed.paymentMethod;
        updateData.userAgent = req.headers['user-agent'] || null;
        let session;
        if (existingSession) {
            session = await prisma.checkoutSession.update({
                where: { id: existingSession.id },
                data: updateData,
            });
        }
        else {
            session = await prisma.checkoutSession.create({
                data: {
                    sessionId: sessionId,
                    status: 'active',
                    name: parsed.name ? stripHtml(parsed.name) : null,
                    phone: normalizedPhone,
                    districtArea: parsed.districtArea ? stripHtml(parsed.districtArea) : null,
                    address: stripHtml(trimmedAddress),
                    note: parsed.note ? stripHtml(parsed.note) : null,
                    deliveryMethod: parsed.deliveryMethod,
                    paymentMethod: parsed.paymentMethod,
                    userAgent: req.headers['user-agent'] || null,
                    items: parsed.items
                        ? {
                            create: parsed.items.map((item) => ({
                                productId: item.productId,
                                variantId: item.variantId || null,
                                nameSnapshot: item.name,
                                unitPrice: item.unitPrice,
                                discountPercent: item.discountPercent,
                                quantity: item.quantity,
                            })),
                        }
                        : undefined,
                },
            });
        }
        if (parsed.items) {
            await prisma.checkoutSessionItem.deleteMany({
                where: { sessionId: session.id },
            });
            await prisma.checkoutSessionItem.createMany({
                data: parsed.items.map((item) => ({
                    sessionId: session.id,
                    productId: item.productId,
                    variantId: item.variantId || null,
                    nameSnapshot: item.name,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountPercent,
                    quantity: item.quantity,
                })),
            });
        }
        res.json({ sessionId: session.sessionId });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=checkout.js.map