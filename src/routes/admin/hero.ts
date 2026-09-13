import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requirePermission } from '../../lib/guard';
import { AppError } from '../../types/api';

const router = Router();

const MAX_SLIDES = 10;

const slideSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  imageUrl: z.string().url().optional().nullable(),
  ctaEnabled: z.boolean().optional().default(false),
  ctaText: z.string().max(100).optional().nullable(),
  ctaUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
  active: z.boolean().optional().default(true),
});

const reorderSchema = z.object({
  slideIds: z.array(z.string().uuid()).min(1),
});

router.get('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'HERO_VIEW');
    const slides = await prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ items: slides });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = slideSchema.parse(req.body);
    const session = await requireAuth(req);
    requirePermission(session, 'HERO_CREATE');

    const count = await prisma.heroSlide.count();
    if (count >= MAX_SLIDES) {
      throw new AppError('BAD_REQUEST', `Maximum of ${MAX_SLIDES} slides allowed`);
    }

    const maxOrder = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } });
    const sortOrder = parsed.sortOrder ?? ((maxOrder._max.sortOrder ?? -1) + 1);

    const slide = await prisma.heroSlide.create({
      data: {
        title: parsed.title,
        subtitle: parsed.subtitle,
        imageUrl: parsed.imageUrl,
        ctaEnabled: parsed.ctaEnabled,
        ctaText: parsed.ctaText,
        ctaUrl: parsed.ctaUrl,
        sortOrder,
        active: parsed.active,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'hero_slide.create',
        entityType: 'HeroSlide',
        entityId: slide.id,
        metadata: { title: slide.title },
      },
    });

    res.status(201).json(slide);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = slideSchema.partial().parse(req.body);
    const session = await requireAuth(req);
    requirePermission(session, 'HERO_UPDATE');

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Slide not found');

    const slide = await prisma.heroSlide.update({
      where: { id },
      data: parsed,
    });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'hero_slide.update',
        entityType: 'HeroSlide',
        entityId: slide.id,
        metadata: { title: slide.title },
      },
    });

    res.json(slide);
  } catch (err) {
    next(err);
  }
});

router.put('/reorder', async (req, res, next) => {
  try {
    const parsed = reorderSchema.parse(req.body);
    const session = await requireAuth(req);
    requirePermission(session, 'HERO_CAROUSEL_MANAGE');

    await prisma.$transaction(
      parsed.slideIds.map((slideId, index) =>
        prisma.heroSlide.update({
          where: { id: slideId },
          data: { sortOrder: index },
        }),
      ),
    );

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'hero_slide.reorder',
        entityType: 'HeroSlide',
        metadata: { order: parsed.slideIds },
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await requireAuth(req);
    requirePermission(session, 'HERO_DELETE');

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Slide not found');

    await prisma.heroSlide.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'hero_slide.delete',
        entityType: 'HeroSlide',
        entityId: id,
        metadata: { title: existing.title },
      },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
