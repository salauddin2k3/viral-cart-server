import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { generateSlug, ensureUniqueSlug } from '../../lib/slug.js';
import { parsePaginationParams, buildPaginationResult } from '../../lib/cursor.js';
import type { Prisma } from '@prisma/client';

const router = Router();

const contentSectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  data: z.record(z.string(), z.unknown()).default({}),
});

const landingPageCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(500).optional().default(''),
  slug: z.string().trim().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-friendly').optional().or(z.literal('')),
  productId: z.string().uuid().nullable().optional(),
  template: z.enum(['design_a', 'design_b', 'design_c']).default('design_a'),
  content: z.record(z.string(), z.unknown()).default({}),
  sections: z.array(contentSectionSchema).optional().default([]),
  heroImageUrl: z.string().url().nullable().optional().or(z.literal('')),
  metaDescription: z.string().trim().max(500).optional().default(''),
  active: z.boolean().default(false),
});

const landingPageUpdateSchema = landingPageCreateSchema.partial();

router.get('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'LANDING_PAGES_VIEW');

    const { limit, cursor } = parsePaginationParams(req.query);
    const take = limit + 1;
    const filterStatus = (req.query.status as string) || undefined;

    const where: Prisma.LandingPageWhereInput = {};
    if (filterStatus === 'published') where.active = true;
    else if (filterStatus === 'draft') where.active = false;

    const items = await prisma.landingPage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor.value } } : {}),
      include: {
        product: {
          select: { id: true, name: true, slug: true, finalPrice: true, images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } } },
        },
      },
    });

    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, limit) : items;

    const [publishedCount, draftCount] = await Promise.all([
      prisma.landingPage.count({ where: { active: true } }),
      prisma.landingPage.count({ where: { active: false } }),
    ]);

    res.json({
      ...buildPaginationResult(page, limit, hasMore),
      summary: { published: publishedCount, draft: draftCount },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'LANDING_PAGES_VIEW');

    const { id } = req.params;
    const page = await prisma.landingPage.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, regularPrice: true, finalPrice: true,
            discountEnabled: true, discountPercent: true, stock: true, trackInventory: true,
            images: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, altText: true, sortOrder: true } },
            category: { select: { id: true, name: true, slug: true } },
            variants: { select: { id: true, name: true, sku: true, regularPrice: true, finalPrice: true, discountEnabled: true, discountPercent: true, stock: true, sortOrder: true } },
          },
        },
      },
    });

    if (!page) throw new AppError('NOT_FOUND', 'Landing page not found');
    res.json(page);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'LANDING_PAGES_CREATE');

    const parsed = landingPageCreateSchema.parse(req.body);

    const existingSlugs = (await prisma.landingPage.findMany({ select: { slug: true } })).map((p) => p.slug);
    const slug = ensureUniqueSlug(
      parsed.slug && parsed.slug.length > 0 ? parsed.slug : generateSlug(parsed.title),
      existingSlugs,
    );

    const content = { ...(parsed.content ?? {}), sections: parsed.sections ?? [] };

    const page = await prisma.landingPage.create({
      data: {
        slug,
        title: parsed.title,
        subtitle: parsed.subtitle || null,
        productId: parsed.productId || null,
        template: parsed.template,
        content: content as Prisma.InputJsonValue,
        heroImageUrl: parsed.heroImageUrl || null,
        metaDescription: parsed.metaDescription || null,
        active: parsed.active,
        publishedAt: parsed.active ? new Date() : null,
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'landing_page_created',
        entityType: 'landing_page',
        entityId: page.id,
        metadata: { title: page.title, slug: page.slug },
      },
    });

    res.status(201).json(page);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'LANDING_PAGES_UPDATE');

    const { id } = req.params;
    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Landing page not found');

    const parsed = landingPageUpdateSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};

    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.subtitle !== undefined) updateData.subtitle = parsed.subtitle || null;
    if (parsed.productId !== undefined) updateData.productId = parsed.productId || null;
    if (parsed.template !== undefined) updateData.template = parsed.template;
    if (parsed.heroImageUrl !== undefined) updateData.heroImageUrl = parsed.heroImageUrl || null;
    if (parsed.metaDescription !== undefined) updateData.metaDescription = parsed.metaDescription || null;

    if (parsed.content !== undefined || parsed.sections !== undefined) {
      const mergedContent = {
        ...(parsed.content ?? (existing.content as Record<string, unknown>)),
        sections: parsed.sections ?? ((existing.content as Record<string, unknown>)?.sections ?? []),
      };
      updateData.content = mergedContent as Prisma.InputJsonValue;
    }

    if (parsed.active !== undefined) {
      updateData.active = parsed.active;
      if (parsed.active && !existing.active) {
        updateData.publishedAt = new Date();
      }
    }

    if (parsed.slug && parsed.slug !== existing.slug) {
      const existingSlugs = (await prisma.landingPage.findMany({ select: { slug: true }, where: { id: { not: id } } })).map((p) => p.slug);
      updateData.slug = ensureUniqueSlug(parsed.slug, existingSlugs);
    } else if (parsed.title && !parsed.slug) {
      const autoSlug = generateSlug(parsed.title);
      const existingSlugs = (await prisma.landingPage.findMany({ select: { slug: true }, where: { id: { not: id } } })).map((p) => p.slug);
      updateData.slug = ensureUniqueSlug(autoSlug, existingSlugs);
    }

    const page = await prisma.landingPage.update({
      where: { id },
      data: updateData,
      include: { product: { select: { id: true, name: true, slug: true } } },
    });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'landing_page_updated',
        entityType: 'landing_page',
        entityId: page.id,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    res.json(page);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'LANDING_PAGES_CREATE');

    const { id } = req.params;
    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Landing page not found');

    const existingSlugs = (await prisma.landingPage.findMany({ select: { slug: true } })).map((p) => p.slug);
    const newSlug = ensureUniqueSlug(generateSlug(`${existing.title} copy`), existingSlugs);

    const page = await prisma.landingPage.create({
      data: {
        slug: newSlug,
        title: `${existing.title} (Copy)`,
        subtitle: existing.subtitle,
        productId: existing.productId,
        template: existing.template,
        content: existing.content as Prisma.InputJsonValue,
        heroImageUrl: existing.heroImageUrl,
        metaDescription: existing.metaDescription,
        active: false,
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'landing_page_duplicated',
        entityType: 'landing_page',
        entityId: page.id,
        metadata: { sourceId: id, title: page.title },
      },
    });

    res.status(201).json(page);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'LANDING_PAGES_DELETE');

    const { id } = req.params;
    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Landing page not found');

    await prisma.landingPage.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'landing_page_deleted',
        entityType: 'landing_page',
        entityId: id,
        metadata: { title: existing.title, slug: existing.slug },
      },
    });

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
