import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const slides = await prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        ctaEnabled: true,
        ctaText: true,
        ctaUrl: true,
      },
    });
    res.json({ items: slides });
  } catch (err) {
    next(err);
  }
});

export default router;
