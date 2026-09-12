import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../../lib/validate.js';
import { generateSlug, ensureUniqueSlug } from '../../lib/slug.js';
import { parsePaginationParams, buildPaginationResult } from '../../lib/cursor.js';
const router = Router();
router.get('/', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'CATEGORIES_VIEW');
        const { limit, cursor } = parsePaginationParams(req.query);
        const take = limit + 1;
        const where = {};
        const orderBy = { createdAt: 'desc' };
        const items = await prisma.category.findMany({
            where,
            orderBy,
            take,
            ...(cursor
                ? { skip: 1, cursor: { id: cursor.value } }
                : {}),
        });
        const hasMore = items.length > take;
        const page = hasMore ? items.slice(0, limit) : items;
        const response = buildPaginationResult(page, limit, hasMore);
        res.json(response);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'CATEGORIES_CREATE');
        const parsed = categoryCreateSchema.parse(req.body);
        const existingSlugs = (await prisma.category.findMany({ select: { slug: true } })).map((c) => c.slug);
        const slug = ensureUniqueSlug(parsed.slug && parsed.slug.length > 0 ? parsed.slug : generateSlug(parsed.name), existingSlugs);
        const category = await prisma.category.create({
            data: {
                name: parsed.name,
                slug,
                imageUrl: parsed.imageUrl,
                parentCategoryId: parsed.parentCategoryId ?? null,
                status: 'active',
            },
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'category_created',
                entityType: 'category',
                entityId: category.id,
                metadata: { name: category.name, slug: category.slug },
            },
        });
        res.status(201).json(category);
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'CATEGORIES_UPDATE');
        const { id } = req.params;
        const parsed = categoryUpdateSchema.parse(req.body);
        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            throw new AppError('NOT_FOUND', 'Category not found');
        }
        const updateData = { ...parsed };
        if (parsed.slug && parsed.slug !== existing.slug) {
            const existingSlugs = (await prisma.category.findMany({
                select: { slug: true },
                where: { id: { not: id } },
            })).map((c) => c.slug);
            updateData.slug = ensureUniqueSlug(parsed.slug, existingSlugs);
        }
        if (parsed.name && !parsed.slug) {
            const autoSlug = generateSlug(parsed.name);
            const existingSlugs = (await prisma.category.findMany({
                select: { slug: true },
                where: { id: { not: id } },
            })).map((c) => c.slug);
            updateData.slug = ensureUniqueSlug(autoSlug, existingSlugs);
        }
        const category = await prisma.category.update({
            where: { id },
            data: updateData,
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'category_updated',
                entityType: 'category',
                entityId: category.id,
                metadata: { changes: Object.keys(updateData) },
            },
        });
        res.json(category);
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id/status', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'CATEGORIES_UPDATE');
        const { id } = req.params;
        const { status } = z.object({ status: z.enum(['active', 'inactive']) }).parse(req.body);
        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            throw new AppError('NOT_FOUND', 'Category not found');
        }
        const category = await prisma.category.update({
            where: { id },
            data: { status },
        });
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'category_status_changed',
                entityType: 'category',
                entityId: category.id,
                metadata: { from: existing.status, to: status },
            },
        });
        res.json(category);
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const staff = await requireAuth(req);
        requirePermission(staff, 'CATEGORIES_DELETE');
        const { id } = req.params;
        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            throw new AppError('NOT_FOUND', 'Category not found');
        }
        const uncategorized = await prisma.category.upsert({
            where: { slug: 'uncategorized' },
            update: {},
            create: { name: 'Uncategorized', slug: 'uncategorized', status: 'active' },
        });
        await prisma.$transaction([
            prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: uncategorized.id } }),
            prisma.category.updateMany({ where: { parentCategoryId: id }, data: { parentCategoryId: null } }),
            prisma.category.delete({ where: { id } }),
        ]);
        await prisma.activityLog.create({
            data: {
                actorId: staff.user.id,
                actorRole: staff.user.role,
                action: 'category_deleted',
                entityType: 'category',
                entityId: id,
                metadata: { name: existing.name, slug: existing.slug },
            },
        });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=categories.js.map